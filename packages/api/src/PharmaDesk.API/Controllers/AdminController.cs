using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "SuperAdmin, Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IdentityDbContext _db;
        private readonly AppDbContext _appDb;
        private readonly CarrierAuthService _carrierAuth;

        public AdminController(IdentityDbContext db, AppDbContext appDb, CarrierAuthService carrierAuth)
        {
            _db = db;
            _appDb = appDb;
            _carrierAuth = carrierAuth;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            // Count pharmacies from PharmacyProfiles (not IdentityUsers)
            var totalPharmacies = await _appDb.PharmacyProfiles.CountAsync();
            var totalDrugs = await _appDb.Medications.CountAsync();
            var pendingApprovals = await _db.IdentityUsers.CountAsync(u => !u.IsApproved && u.Role == "User");
            var totalOffers = await _appDb.Offers.IgnoreQueryFilters().CountAsync();
            var activeTransfers = await _appDb.Shipments.CountAsync(s => s.Status == ShipmentStatus.InTransit);
            
            // Count active users - all approved users with Role=User (regardless of Status)
            var activeUsers = await _db.IdentityUsers.CountAsync(u => u.Role == "User" && u.IsApproved);
            
            // Count groups
            var totalGroups = await _appDb.Groups.CountAsync();
            
            var stats = new
            {
                TotalPharmacies = totalPharmacies,
                TotalDrugs = totalDrugs,
                PendingApprovals = pendingApprovals,
                TotalOffers = totalOffers,
                ActiveTransfers = activeTransfers,
                ActiveUsers = activeUsers,
                TotalGroups = totalGroups
            };

            return Ok(stats);
        }

        // ═══════════════════════════════════════════════════════════════
        // Admin Offers Endpoint - All offers with IgnoreQueryFilters
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Get all offers in the system (ignoring soft delete filters)
        /// </summary>
        [HttpGet("offers")]
        public async Task<IActionResult> GetAllOffers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] int? groupId = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            var query = _appDb.Offers
                .IgnoreQueryFilters() // Include soft-deleted offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .AsQueryable();

            // Group filter - get pharmacies in the group
            if (groupId.HasValue)
            {
                var groupPharmacyIds = await _appDb.PharmacyGroups
                    .Where(pg => pg.GroupId == groupId.Value && pg.IsActive)
                    .Select(pg => pg.PharmacyProfileId)
                    .ToListAsync();
                
                query = query.Where(o => groupPharmacyIds.Contains(o.PharmacyProfileId));
            }

            // Apply status filter
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<OfferStatus>(status, true, out var statusEnum))
            {
                query = query.Where(o => o.Status == statusEnum);
            }

            // Date filters
            if (startDate.HasValue)
            {
                query = query.Where(o => o.CreatedAt >= startDate.Value);
            }
            if (endDate.HasValue)
            {
                query = query.Where(o => o.CreatedAt <= endDate.Value.AddDays(1)); // Include the entire end day
            }

            // Apply search filter
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLowerInvariant();
                query = query.Where(o => 
                    (o.Medication != null && o.Medication.Name.ToLower().Contains(searchLower)) ||
                    (o.PharmacyProfile != null && o.PharmacyProfile.PharmacyName.ToLower().Contains(searchLower)));
            }

            var totalCount = await query.CountAsync();

            var offers = await query
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new
                {
                    id = o.Id,
                    medicationName = o.Medication != null ? o.Medication.Name : "Bilinmiyor",
                    medicationBarcode = o.Medication != null ? o.Medication.Barcode : null,
                    pharmacyName = o.PharmacyProfile != null ? o.PharmacyProfile.PharmacyName : "Bilinmiyor",
                    pharmacyId = o.PharmacyProfileId,
                    quantity = o.Stock,
                    remainingQuantity = o.Stock - o.SoldQuantity,
                    unitPrice = o.Price,
                    totalPrice = o.Price * o.Stock,
                    status = o.Status.ToString(),
                    offerType = o.Type.ToString(),
                    expiryDate = o.ExpirationDate,
                    createdAt = o.CreatedAt,
                    isDeleted = o.IsDeleted
                })
                .ToListAsync();

            return Ok(new
            {
                data = offers,
                totalCount = totalCount,
                page = page,
                pageSize = pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // Admin Transactions Endpoint - All transactions with summary
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Get all transactions in the system with summary stats
        /// </summary>
        [HttpGet("transactions")]
        public async Task<IActionResult> GetAllTransactions(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? search = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] int? groupId = null,
            [FromQuery] string? type = null,
            [FromQuery] string? status = null)
        {
            var query = _appDb.Transactions
                .Include(t => t.PharmacyProfile)
                .Include(t => t.CounterpartyPharmacy)
                .AsQueryable();

            // Group filter - get pharmacies in the group
            if (groupId.HasValue)
            {
                var groupPharmacyIds = await _appDb.PharmacyGroups
                    .Where(pg => pg.GroupId == groupId.Value && pg.IsActive)
                    .Select(pg => pg.PharmacyProfileId)
                    .ToListAsync();
                
                query = query.Where(t => groupPharmacyIds.Contains(t.PharmacyProfileId) || 
                                         (t.CounterpartyPharmacyId.HasValue && groupPharmacyIds.Contains(t.CounterpartyPharmacyId.Value)));
            }

            // Type filter
            if (!string.IsNullOrEmpty(type) && Enum.TryParse<TransactionType>(type, out var typeEnum))
            {
                query = query.Where(t => t.Type == typeEnum);
            }

            // Status filter
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<TransactionStatus>(status, out var statusEnum))
            {
                query = query.Where(t => t.Status == statusEnum);
            }

            // Date filters
            if (startDate.HasValue)
            {
                query = query.Where(t => t.Date >= startDate.Value);
            }
            if (endDate.HasValue)
            {
                query = query.Where(t => t.Date <= endDate.Value);
            }

            // Search filter
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLowerInvariant();
                query = query.Where(t => 
                    (t.PharmacyProfile != null && t.PharmacyProfile.PharmacyName.ToLower().Contains(searchLower)) ||
                    (t.CounterpartyPharmacy != null && t.CounterpartyPharmacy.PharmacyName.ToLower().Contains(searchLower)) ||
                    (t.Description != null && t.Description.ToLower().Contains(searchLower)));
            }

            // Summary stats
            var allTransactions = await _appDb.Transactions.ToListAsync();
            var today = DateTime.UtcNow.Date;
            var totalVolume = allTransactions.Sum(t => Math.Abs(t.Amount));
            var todayCount = allTransactions.Count(t => t.Date.Date == today);
            var completedCount = allTransactions.Count(t => t.Status == TransactionStatus.Completed);
            var pendingCount = allTransactions.Count(t => t.Status == TransactionStatus.Pending);

            var totalCount = await query.CountAsync();

            var transactions = await query
                .OrderByDescending(t => t.Date)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    id = t.Id,
                    date = t.Date.ToString("dd.MM.yyyy HH:mm"),
                    type = t.Type.ToString(),
                    description = t.Description,
                    sender = t.PharmacyProfile != null ? t.PharmacyProfile.PharmacyName : "Sistem",
                    receiver = t.CounterpartyPharmacy != null ? t.CounterpartyPharmacy.PharmacyName : "-",
                    amount = t.Amount,
                    status = t.Status.ToString()
                })
                .ToListAsync();

            return Ok(new
            {
                data = transactions,
                totalCount = totalCount,
                page = page,
                pageSize = pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                summary = new
                {
                    totalVolume = totalVolume,
                    todayCount = todayCount,
                    completedCount = completedCount,
                    pendingCount = pendingCount
                }
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // User Approval Endpoints
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Get all users pending admin approval
        /// </summary>
        [HttpGet("users/pending")]
        public async Task<IActionResult> GetPendingUsers()
        {
            var pendingUsers = await _db.IdentityUsers
                .Where(u => !u.IsApproved)
                .OrderByDescending(u => u.CreatedAt)
                .ToListAsync();
            
            var profiles = await _appDb.PharmacyProfiles.ToListAsync();
            
            var result = pendingUsers.Select(user =>
            {
                var profile = profiles.FirstOrDefault(p => p.Id == user.PharmacyId);
                return new
                {
                    id = user.Id,
                    email = user.Email,
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    pharmacyName = profile?.PharmacyName ?? "",
                    gln = profile?.GLN ?? "",
                    city = profile?.City ?? "",
                    district = profile?.District ?? "",
                    createdAt = user.CreatedAt
                };
            }).ToList();

            return Ok(result);
        }

        /// <summary>
        /// Approve a user for system access
        /// </summary>
        [HttpPost("users/{userId}/approve")]
        public async Task<IActionResult> ApproveUser(int userId)
        {
            var user = await _db.IdentityUsers.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { error = "Kullanıcı bulunamadı." });
            }
            
            if (user.IsApproved)
            {
                return BadRequest(new { error = "Kullanıcı zaten onaylanmış." });
            }
            
            user.IsApproved = true;
            await _db.SaveChangesAsync();
            
            Console.WriteLine($"[AdminController] User {userId} ({user.Email}) has been approved.");
            
            return Ok(new { 
                message = "Kullanıcı onaylandı.", 
                userId = userId,
                email = user.Email
            });
        }

        /// <summary>
        /// Reject/deactivate a user
        /// </summary>
        [HttpPost("users/{userId}/reject")]
        public async Task<IActionResult> RejectUser(int userId)
        {
            var user = await _db.IdentityUsers.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { error = "Kullanıcı bulunamadı." });
            }
            
            // Set status to Suspended and keep IsApproved as false
            user.Status = UserStatus.Suspended;
            await _db.SaveChangesAsync();
            
            Console.WriteLine($"[AdminController] User {userId} ({user.Email}) has been rejected/suspended.");
            
            return Ok(new { 
                message = "Kullanıcı reddedildi.", 
                userId = userId
            });
        }

        [HttpGet("recent-activities")]
        public IActionResult GetRecentActivities()
        {
            // Mock data for now as we don't have a clear Activity Log model yet.
            var activities = new[]
            {
                new { Id = 1, Description = "Eczane A sisteme kayıt oldu.", Date = DateTime.UtcNow.AddHours(-1) },
                new { Id = 2, Description = "Yeni ilaç 'Aspirin' eklendi.", Date = DateTime.UtcNow.AddHours(-2) },
                new { Id = 3, Description = "Eczane B stok güncelledi.", Date = DateTime.UtcNow.AddHours(-5) }
            };

            return Ok(activities);
        }

        [HttpGet("pharmacies")]
        public async Task<IActionResult> GetPharmacies()
        {
            // Cannot join across different contexts, so fetch separately and combine
            var profiles = await _appDb.PharmacyProfiles.ToListAsync();
            var users = await _db.IdentityUsers.ToListAsync();
            
            // Get offer counts per pharmacy
            var offerCounts = await _appDb.Offers
                .IgnoreQueryFilters()
                .GroupBy(o => o.PharmacyProfileId)
                .Select(g => new { PharmacyId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.PharmacyId, x => x.Count);
            
            // Get balance per pharmacy (sum of transactions)
            var balances = await _appDb.PharmacyProfiles
                .Select(p => new { p.Id, p.Balance })
                .ToDictionaryAsync(x => x.Id, x => x.Balance);
            
            var pharmacies = profiles.Select(profile =>
            {
                var user = users.FirstOrDefault(u => u.PharmacyId == profile.Id);
                return new
                {
                    id = profile.Id,
                    pharmacyname = profile.PharmacyName,
                    email = user?.Email ?? "",
                    phone = profile.PhoneNumber,
                    balance = balances.GetValueOrDefault(profile.Id, 0m),
                    offer_count = offerCounts.GetValueOrDefault(profile.Id, 0),
                    city = profile.City,
                    district = profile.District
                };
            }).ToList();

            return Ok(pharmacies);
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers(
            [FromQuery] string? role = null,
            [FromQuery] bool? isApproved = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] string? search = null)
        {
            // Cannot join across different contexts, so fetch separately and combine
            var identityUsersQuery = _db.IdentityUsers.AsQueryable();
            
            // Apply filters
            if (!string.IsNullOrEmpty(role))
            {
                identityUsersQuery = identityUsersQuery.Where(u => u.Role == role);
            }
            if (isApproved.HasValue)
            {
                identityUsersQuery = identityUsersQuery.Where(u => u.IsApproved == isApproved.Value);
            }
            if (isActive.HasValue)
            {
                var targetStatus = isActive.Value ? UserStatus.Active : UserStatus.Suspended;
                identityUsersQuery = identityUsersQuery.Where(u => u.Status == targetStatus);
            }
            
            var identityUsers = await identityUsersQuery.OrderByDescending(u => u.CreatedAt).ToListAsync();
            var profiles = await _appDb.PharmacyProfiles.ToListAsync();
            var pharmacyGroups = await _appDb.PharmacyGroups
                .Include(pg => pg.Group)
                .ToListAsync();
            
            var users = identityUsers.Select(user =>
            {
                var profile = profiles.FirstOrDefault(p => p.Id == user.PharmacyId);
                var userGroups = pharmacyGroups
                    .Where(pg => pg.PharmacyProfileId == user.PharmacyId && pg.IsActive)
                    .Select(pg => new { id = pg.GroupId, name = pg.Group?.Name ?? "" })
                    .ToList();
                    
                return new
                {
                    id = user.Id,
                    email = user.Email,
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    pharmacyName = profile?.PharmacyName ?? "",
                    gln = profile?.GLN ?? "",
                    city = profile?.City ?? "",
                    district = profile?.District ?? "",
                    address = profile?.Address ?? "",
                    phoneNumber = profile?.PhoneNumber ?? "",
                    role = user.Role ?? "User",
                    isApproved = user.IsApproved,
                    isActive = user.Status == UserStatus.Active,
                    createdAt = user.CreatedAt,
                    pharmacyId = user.PharmacyId.ToString(),
                    groups = userGroups
                };
            }).ToList();
            
            // Apply search filter (on combined data)
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLowerInvariant();
                users = users.Where(u =>
                    u.email.ToLowerInvariant().Contains(searchLower) ||
                    u.firstName.ToLowerInvariant().Contains(searchLower) ||
                    u.lastName.ToLowerInvariant().Contains(searchLower) ||
                    u.pharmacyName.ToLowerInvariant().Contains(searchLower) ||
                    u.city.ToLowerInvariant().Contains(searchLower)
                ).ToList();
            }

            return Ok(users);
        }

        // ═══════════════════════════════════════════════════════════════
        // Advanced User Management Endpoints
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Get detailed user information by ID
        /// </summary>
        [HttpGet("users/{userId}")]
        public async Task<IActionResult> GetUserDetail(int userId)
        {
            var user = await _db.IdentityUsers.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { error = "Kullanıcı bulunamadı." });
            }

            var profile = await _appDb.PharmacyProfiles.FindAsync(user.PharmacyId);
            var userGroups = await _appDb.PharmacyGroups
                .Where(pg => pg.PharmacyProfileId == user.PharmacyId && pg.IsActive)
                .Include(pg => pg.Group)
                .Select(pg => new { id = pg.GroupId, name = pg.Group.Name })
                .ToListAsync();

            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                pharmacyName = profile?.PharmacyName ?? "",
                gln = profile?.GLN ?? "",
                city = profile?.City ?? "",
                district = profile?.District ?? "",
                address = profile?.Address ?? "",
                phoneNumber = profile?.PhoneNumber ?? "",
                role = user.Role ?? "User",
                isApproved = user.IsApproved,
                isActive = user.Status == UserStatus.Active,
                createdAt = user.CreatedAt,
                lastLoginDate = user.LastLoginDate,
                pharmacyId = user.PharmacyId.ToString(),
                groups = userGroups
            });
        }

        /// <summary>
        /// Update user profile information (email and password excluded)
        /// </summary>
        [HttpPut("users/{userId}")]
        public async Task<IActionResult> UpdateUser(int userId, [FromBody] UserUpdateRequest req)
        {
            var user = await _db.IdentityUsers.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { error = "Kullanıcı bulunamadı." });
            }

            var profile = await _appDb.PharmacyProfiles.FindAsync(user.PharmacyId);
            if (profile == null)
            {
                return NotFound(new { error = "Eczane profili bulunamadı." });
            }

            // Update IdentityUser fields
            if (!string.IsNullOrEmpty(req.FirstName)) user.FirstName = req.FirstName;
            if (!string.IsNullOrEmpty(req.LastName)) user.LastName = req.LastName;

            // Update PharmacyProfile fields
            if (!string.IsNullOrEmpty(req.PharmacyName)) profile.PharmacyName = req.PharmacyName;
            if (!string.IsNullOrEmpty(req.GLN)) profile.GLN = req.GLN;
            if (!string.IsNullOrEmpty(req.City)) profile.City = req.City;
            if (!string.IsNullOrEmpty(req.District)) profile.District = req.District;
            if (!string.IsNullOrEmpty(req.Address)) profile.Address = req.Address;
            if (!string.IsNullOrEmpty(req.PhoneNumber)) profile.PhoneNumber = req.PhoneNumber;

            await _db.SaveChangesAsync();
            await _appDb.SaveChangesAsync();

            Console.WriteLine($"[AdminController] User {userId} ({user.Email}) has been updated.");

            return Ok(new { message = "Kullanıcı bilgileri güncellendi." });
        }

        /// <summary>
        /// Toggle user active/suspended status
        /// </summary>
        [HttpPatch("users/{userId}/toggle-status")]
        public async Task<IActionResult> ToggleUserStatus(int userId)
        {
            // Self-action validation
            var adminIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(adminIdClaim, out int adminId) && adminId == userId)
            {
                return BadRequest(new { error = "Kendi hesabınızı pasife alamazsınız." });
            }

            var user = await _db.IdentityUsers.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { error = "Kullanıcı bulunamadı." });
            }

            // Toggle status
            var previousStatus = user.Status;
            user.Status = user.Status == UserStatus.Active ? UserStatus.Suspended : UserStatus.Active;
            await _db.SaveChangesAsync();

            var newStatusText = user.Status == UserStatus.Active ? "Aktif" : "Pasif";
            Console.WriteLine($"[AdminController] User {userId} ({user.Email}) status changed: {previousStatus} -> {user.Status}");

            return Ok(new
            {
                message = $"Kullanıcı durumu '{newStatusText}' olarak güncellendi.",
                isActive = user.Status == UserStatus.Active
            });
        }

        /// <summary>
        /// Hard delete user and related data
        /// </summary>
        [HttpDelete("users/{userId}")]
        public async Task<IActionResult> DeleteUser(int userId)
        {
            // Self-action validation
            var adminIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(adminIdClaim, out int adminId) && adminId == userId)
            {
                return BadRequest(new { error = "Kendi hesabınızı silemezsiniz." });
            }

            var user = await _db.IdentityUsers.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { error = "Kullanıcı bulunamadı." });
            }

            var pharmacyId = user.PharmacyId;
            var userEmail = user.Email;

            Console.WriteLine($"[AdminController] Starting comprehensive deletion for user {userId} ({userEmail}), PharmacyId: {pharmacyId}");

            // ═══════════════════════════════════════════════════════════════
            // 1. IDENTITY DB - Delete auth-related data
            // ═══════════════════════════════════════════════════════════════
            
            // Delete refresh tokens
            var refreshTokens = await _db.RefreshTokens.Where(rt => rt.UserId == userId).ToListAsync();
            _db.RefreshTokens.RemoveRange(refreshTokens);
            Console.WriteLine($"  - Deleted {refreshTokens.Count} refresh tokens");

            // Delete IdentityUser
            _db.IdentityUsers.Remove(user);
            await _db.SaveChangesAsync();
            Console.WriteLine($"  - Deleted IdentityUser");

            // ═══════════════════════════════════════════════════════════════
            // 2. APP DB - Delete all pharmacy-related data
            // ═══════════════════════════════════════════════════════════════

            // Delete StockLocks (kilitlenen stoklar)
            var stockLocks = await _appDb.StockLocks.Where(sl => sl.PharmacyProfileId == pharmacyId).ToListAsync();
            _appDb.StockLocks.RemoveRange(stockLocks);
            Console.WriteLine($"  - Deleted {stockLocks.Count} stock locks");

            // Delete Notifications
            var notifications = await _appDb.Notifications.Where(n => n.PharmacyProfileId == pharmacyId).ToListAsync();
            _appDb.Notifications.RemoveRange(notifications);
            Console.WriteLine($"  - Deleted {notifications.Count} notifications");

            // Delete Transactions (hem sahibi hem karşı taraf olanlar)
            var transactions = await _appDb.Transactions
                .Where(t => t.PharmacyProfileId == pharmacyId || t.CounterpartyPharmacyId == pharmacyId)
                .ToListAsync();
            _appDb.Transactions.RemoveRange(transactions);
            Console.WriteLine($"  - Deleted {transactions.Count} transactions");

            // Delete Cart & CartItems
            var carts = await _appDb.Carts
                .Include(c => c.CartItems)
                .Where(c => c.PharmacyProfileId == pharmacyId)
                .ToListAsync();
            foreach (var cart in carts)
            {
                _appDb.CartItems.RemoveRange(cart.CartItems);
            }
            _appDb.Carts.RemoveRange(carts);
            Console.WriteLine($"  - Deleted {carts.Count} carts with items");

            // Delete Orders & OrderItems (hem alıcı hem satıcı olarak)
            var orders = await _appDb.Orders
                .Include(o => o.OrderItems)
                .Where(o => o.BuyerPharmacyId == pharmacyId || o.SellerPharmacyId == pharmacyId)
                .ToListAsync();
            foreach (var order in orders)
            {
                _appDb.OrderItems.RemoveRange(order.OrderItems);
            }
            _appDb.Orders.RemoveRange(orders);
            Console.WriteLine($"  - Deleted {orders.Count} orders with items");

            // Delete Offers & OfferTargets
            var offers = await _appDb.Offers
                .Include(o => o.OfferTargets)
                .Where(o => o.PharmacyProfileId == pharmacyId)
                .ToListAsync();
            foreach (var offer in offers)
            {
                _appDb.OfferTargets.RemoveRange(offer.OfferTargets);
            }
            _appDb.Offers.RemoveRange(offers);
            Console.WriteLine($"  - Deleted {offers.Count} offers with targets");

            // Delete PharmacyGroups
            var pharmacyGroups = await _appDb.PharmacyGroups.Where(pg => pg.PharmacyProfileId == pharmacyId).ToListAsync();
            _appDb.PharmacyGroups.RemoveRange(pharmacyGroups);
            Console.WriteLine($"  - Deleted {pharmacyGroups.Count} pharmacy group memberships");

            // Delete Messages via ConversationParticipants
            var participantConversationIds = await _appDb.ConversationParticipants
                .Where(cp => cp.UserId == pharmacyId)
                .Select(cp => cp.ConversationId)
                .ToListAsync();
            
            var userMessages = await _appDb.Messages
                .Where(m => m.SenderId == pharmacyId.ToString())
                .ToListAsync();
            _appDb.Messages.RemoveRange(userMessages);
            
            // Delete ConversationParticipants
            var conversationParticipants = await _appDb.ConversationParticipants
                .Where(cp => cp.UserId == pharmacyId)
                .ToListAsync();
            _appDb.ConversationParticipants.RemoveRange(conversationParticipants);
            Console.WriteLine($"  - Deleted {userMessages.Count} messages and {conversationParticipants.Count} conversation participations");

            // FINALLY: Delete PharmacyProfile
            var profile = await _appDb.PharmacyProfiles.FindAsync(pharmacyId);
            if (profile != null)
            {
                _appDb.PharmacyProfiles.Remove(profile);
                Console.WriteLine($"  - Deleted PharmacyProfile");
            }

            await _appDb.SaveChangesAsync();

            Console.WriteLine($"[AdminController] ✓ User {userId} ({userEmail}) and ALL related data have been completely deleted.");

            return Ok(new { 
                message = "Kullanıcı ve ilişkili tüm veriler (teklifler, siparişler, mesajlar, işlemler) tamamen silindi.",
                deletedData = new {
                    refreshTokens = refreshTokens.Count,
                    stockLocks = stockLocks.Count,
                    notifications = notifications.Count,
                    transactions = transactions.Count,
                    carts = carts.Count,
                    orders = orders.Count,
                    offers = offers.Count,
                    pharmacyGroups = pharmacyGroups.Count,
                    messages = userMessages.Count,
                    conversationParticipants = conversationParticipants.Count
                }
            });
        }

        /// <summary>
        /// Generate password reset token for a user
        /// </summary>
        [HttpPost("users/{userId}/reset-password")]
        public async Task<IActionResult> ResetUserPassword(int userId)
        {
            var user = await _db.IdentityUsers.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { error = "Kullanıcı bulunamadı." });
            }

            // Generate reset token (32 characters)
            var resetToken = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(24))
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");

            // Store hashed token and expiry
            user.ResetToken = BCrypt.Net.BCrypt.HashPassword(resetToken);
            user.ResetTokenExpires = DateTime.UtcNow.AddHours(24);
            await _db.SaveChangesAsync();

            // Build full reset link (for frontend consumption)
            // Using the web frontend base URL
            var baseUrl = "http://localhost:3000";
            var resetLink = $"{baseUrl}/reset-password?token={resetToken}&email={Uri.EscapeDataString(user.Email)}";

            Console.WriteLine($"[AdminController] Password reset token generated for user {userId} ({user.Email})");

            return Ok(new
            {
                message = "Şifre sıfırlama token'ı oluşturuldu.",
                resetToken = resetToken,
                resetLink = resetLink,
                expiresAt = user.ResetTokenExpires,
                userEmail = user.Email
            });
        }

        [HttpPost("assign-group")]
        public async Task<IActionResult> AssignGroup([FromBody] AssignGroupRequest req)
        {
            try
            {
                // Log the incoming request
                Console.WriteLine($"[AssignGroup] Received request: PharmacyId={req.PharmacyId}, GroupId={req.GroupId}");
                
                // Parse pharmacyId from string to long (avoids JavaScript precision loss)
                if (!long.TryParse(req.PharmacyId, out long pharmacyId))
                {
                    return BadRequest(new { error = "Invalid pharmacy ID format" });
                }
                
                // 1. Validate Pharmacy
                var pharmacy = await _appDb.PharmacyProfiles.FindAsync(pharmacyId);
                Console.WriteLine($"[AssignGroup] Pharmacy lookup result: {(pharmacy == null ? "NULL" : $"Found: {pharmacy.PharmacyName}")}");
                
                if (pharmacy == null)
                {
                    return NotFound(new { error = "Pharmacy not found" });
                }

                // 2. Validate Group
                var group = await _appDb.Groups.Include(g => g.City).FirstOrDefaultAsync(g => g.Id == req.GroupId);
                if (group == null)
                {
                    return NotFound(new { error = "Group not found" });
                }

                // 3. Validate Same City Constraint
                // Note: Pharmacy.City is a string name, Group.City is an entity with Name.
                // We should compare names carefully (case insensitive, trim)
                var pharmacyCity = pharmacy.City?.Trim().ToLowerInvariant();
                var groupCity = group.City.Name.Trim().ToLowerInvariant();

                if (pharmacyCity != groupCity)
                {
                    return BadRequest(new { error = $"City mismatch. Pharmacy is in '{pharmacy.City}', Group is in '{group.City.Name}'. They must be in the same city." });
                }

                // 4. Check if already a member
                var exists = await _appDb.PharmacyGroups
                    .AnyAsync(pg => pg.PharmacyProfileId == pharmacyId && pg.GroupId == req.GroupId);

                if (exists)
                {
                    return BadRequest(new { error = "Pharmacy is already a member of this group." });
                }

                // 5. Add to Group
                var pharmacyGroup = new PharmacyGroup
                {
                    PharmacyProfileId = pharmacyId,
                    GroupId = req.GroupId,
                    JoinedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _appDb.PharmacyGroups.Add(pharmacyGroup);
                await _appDb.SaveChangesAsync();

                return Ok(new { message = "Pharmacy assigned to group successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to assign group: " + ex.Message });
            }
        }

        /// <summary>
        /// Admin creates a registration token for a carrier
        /// </summary>
        [HttpPost("carriers/create-registration-token")]
        public async Task<IActionResult> CreateCarrierRegistrationToken([FromBody] Backend.Dtos.CreateCarrierTokenRequest req)
        {
            try
            {
                // Get admin ID from JWT token
                var adminIdClaim = User.FindFirst("id")?.Value;
                if (string.IsNullOrEmpty(adminIdClaim) || !int.TryParse(adminIdClaim, out int adminId))
                {
                    // For development, use admin ID 1 if not authenticated
                    adminId = 1;
                }

                var response = await _carrierAuth.CreateRegistrationTokenAsync(req, adminId);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to create registration token: " + ex.Message });
            }
        }
    }

    public class AssignGroupRequest
    {
        public string PharmacyId { get; set; } = string.Empty; // Changed to string to avoid JS precision loss
        public int GroupId { get; set; }
    }

    public class UserUpdateRequest
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PharmacyName { get; set; }
        public string? GLN { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? Address { get; set; }
        public string? PhoneNumber { get; set; }
    }
}
