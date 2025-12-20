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
    [Authorize(Roles = "Admin")]
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
            var totalPharmacies = await _db.IdentityUsers.CountAsync(u => u.Role == "User");
            var totalDrugs = await _appDb.Medications.CountAsync();
            var pendingApprovals = await _db.IdentityUsers.CountAsync(u => !u.IsApproved);
            
            var stats = new
            {
                TotalPharmacies = totalPharmacies,
                TotalDrugs = totalDrugs,
                PendingApprovals = pendingApprovals,
                TotalTransactions = 0
            };

            return Ok(stats);
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
            
            var pharmacies = profiles.Select(profile =>
            {
                var user = users.FirstOrDefault(u => u.PharmacyId == profile.Id);
                return new
                {
                    id = profile.Id,
                    pharmacyname = profile.PharmacyName,
                    email = user?.Email ?? "",
                    phone = profile.PhoneNumber,
                    balance = 0.0, // Placeholder - would come from transactions
                    offer_count = 0, // Placeholder - would come from offers count
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

            // Delete Messages (hem gönderen hem alıcı olarak)
            var messages = await _appDb.Messages
                .Where(m => m.SenderId == pharmacyId.ToString() || m.ReceiverId == pharmacyId.ToString())
                .ToListAsync();
            _appDb.Messages.RemoveRange(messages);
            Console.WriteLine($"  - Deleted {messages.Count} messages");

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
                    messages = messages.Count
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
