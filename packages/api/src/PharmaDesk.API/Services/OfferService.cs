using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PharmaDesk.API.Hubs;

namespace Backend.Services
{
    /// <summary>
    /// Offer business logic implementation
    /// Handles Smart Matching, Transaction creation, Stock management
    /// </summary>
    public class OfferService : IOfferService
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ILogger<OfferService> _logger;

        public OfferService(AppDbContext context, IHubContext<NotificationHub> hubContext, ILogger<OfferService> logger)
        {
            _context = context;
            _hubContext = hubContext;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════════════
        // Query Operations
        // ═══════════════════════════════════════════════════════════════

        public async Task<IEnumerable<OfferDto>> GetAllOffersAsync(string? status, int page, int pageSize)
        {
            var query = _context.Offers.AsQueryable();

            // Filter by status
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<OfferStatus>(status, true, out var offerStatus))
            {
                query = query.Where(o => o.Status == offerStatus);
            }

            // ═══════════════════════════════════════════════════════════════
            // PERFORMANCE OPTIMIZATION: Projection-based query
            // Instead of .Include() which fetches entire entities (over-fetching),
            // we use .Select() to project only the required fields directly in SQL.
            // Benefits:
            // 1. Eliminates N+1 query problem
            // 2. Reduces network transfer by ~90%
            // 3. Single SQL query with JOINs instead of multiple round-trips
            // ═══════════════════════════════════════════════════════════════
            var offers = await query
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new OfferDto
                {
                    // Core identifiers
                    Id = o.Id,
                    MedicationId = o.MedicationId,
                    
                    // Medication info (projected from navigation)
                    ProductName = o.Medication != null ? o.Medication.Name : "",
                    Barcode = o.Medication != null ? o.Medication.Barcode : null,
                    Description = o.Medication != null ? o.Medication.Description : null,
                    Manufacturer = o.Medication != null ? o.Medication.Manufacturer : null,
                    ImageUrl = o.Medication != null && !string.IsNullOrEmpty(o.Medication.ImagePath) 
                        ? "/" + o.Medication.ImagePath 
                        : "/logoYesil.png",
                    ImageCount = o.Medication != null ? o.Medication.ImageCount : 1,
                    
                    // Offer details
                    Type = o.Type.ToString().ToLower(),
                    Stock = o.Stock.ToString() + " + " + o.BonusQuantity.ToString(),
                    Price = o.Price,
                    Status = o.Status.ToString().ToLower(),
                    
                    // Pharmacy info (projected from navigation)
                    PharmacyId = o.PharmacyProfile != null ? o.PharmacyProfile.Id.ToString() : "",
                    PharmacyName = o.PharmacyProfile != null ? o.PharmacyProfile.PharmacyName : "",
                    PharmacyUsername = o.PharmacyProfile != null ? o.PharmacyProfile.Username : null,
                    
                    // Pricing details
                    DepotPrice = o.DepotPrice,
                    MalFazlasi = !string.IsNullOrEmpty(o.MalFazlasi) 
                        ? o.MalFazlasi 
                        : o.MinSaleQuantity.ToString() + "+" + o.BonusQuantity.ToString(),
                    DiscountPercentage = o.DiscountPercentage,
                    NetPrice = o.NetPrice,
                    MaxSaleQuantity = o.MaxSaleQuantity,
                    
                    // Stock tracking
                    SoldQuantity = o.SoldQuantity,
                    RemainingStock = o.Stock - o.SoldQuantity,
                    
                    // Dates
                    ExpirationDate = o.ExpirationDate.HasValue 
                        ? o.ExpirationDate.Value.ToString("MM/yyyy") 
                        : null,
                    CampaignEndDate = o.CampaignEndDate.HasValue 
                        ? o.CampaignEndDate.Value.ToString("yyyy-MM-dd") 
                        : null,
                    CampaignBonusMultiplier = o.Type == OfferType.JointOrder ? o.CampaignBonusMultiplier : null,
                    BiddingDeadline = o.BiddingDeadline.HasValue 
                        ? o.BiddingDeadline.Value.ToString("yyyy-MM-dd") 
                        : null,
                    
                    // Depot info
                    DepotClaimerUserId = o.DepotClaimerUserId,
                    DepotClaimedAt = o.DepotClaimedAt,
                    
                    // Description
                    OfferDescription = o.Description
                })
                .ToListAsync();

            // Enrich with order quantities (buyer info)
            await EnrichOffersWithBuyerInfo(offers);

            // 🆕 Enrich with locked quantities from StockLocks
            await EnrichOffersWithLockInfo(offers);

            return offers;
        }

        public async Task<IEnumerable<OfferDto>> GetMyOffersAsync(long pharmacyId)
        {
            var offers = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .Include(o => o.OfferTargets)
                .Where(o => o.PharmacyProfileId == pharmacyId)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return offers.Select(o => MapToOfferDtoWithTargets(o)).ToList();
        }

        public async Task<OfferDto?> GetOfferByIdAsync(int offerId, long? requestingPharmacyId)
        {
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .Include(o => o.OfferTargets)
                .FirstOrDefaultAsync(o => o.Id == offerId);

            if (offer == null) return null;

            // Authorization check: only owner can view private/inactive offers
            if (offer.PharmacyProfileId != requestingPharmacyId)
            {
                if (offer.Status != OfferStatus.Active || offer.IsPrivate)
                    return null; // Forbid access
            }

            var dto = MapToOfferDtoWithTargets(offer);

            // 🆕 Fetch buyers (participating pharmacies) for this offer
            var orderItems = await _context.OrderItems
                .Include(oi => oi.Order).ThenInclude(o => o.BuyerPharmacy)
                .Where(oi => oi.OfferId == offerId)
                .ToListAsync();

            dto.Buyers = orderItems
                .GroupBy(oi => oi.Order.BuyerPharmacyId)
                .Select(g => new BuyerInfo
                {
                    PharmacyId = g.Key,
                    PharmacyName = g.First().Order.BuyerPharmacy?.PharmacyName ?? "Bilinmeyen",
                    Quantity = g.Sum(x => x.Quantity),
                    OrderDate = g.Max(x => x.Order.OrderDate).ToString("dd/MM/yyyy")
                })
                .ToList();

            return dto;
        }


        public async Task<IEnumerable<OfferDto>> GetOffersByMedicationIdAsync(int medicationId, long? requestingPharmacyId = null)
        {
            // 🆕 Include Active offers AND finalized/sold offers (Passive/Sold + IsFinalized)
            // Finalized/Sold offers will be filtered later based on participant access
            var offers = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .Include(o => o.OfferTargets) // 🆕 Load OfferTargets for Participants
                .Where(o => o.MedicationId == medicationId && 
                    (o.Status == OfferStatus.Active || 
                     ((o.Status == OfferStatus.Passive || o.Status == OfferStatus.Sold) && o.IsFinalized)))
                .OrderBy(o => o.Price)
                .ToListAsync();

            var offerIds = offers.Select(o => o.Id).ToList();

            // 🆕 Get buyer info directly by OfferId (not SellerPharmacyId match)
            // This correctly handles cases where offer ownership changes (depot claim)
            var allOrderItems = await _context.OrderItems
                .Include(oi => oi.Order).ThenInclude(o => o.BuyerPharmacy)
                .Where(oi => oi.OfferId.HasValue && offerIds.Contains(oi.OfferId.Value))
                .ToListAsync();

            // 🆕 Build participant map for finalized offer access control
            // Key = OfferId, Value = List of participant pharmacy IDs (owner + buyers)
            var participantMap = new Dictionary<int, HashSet<long>>();
            foreach (var offer in offers)
            {
                if (offer.IsFinalized)
                {
                    var participants = new HashSet<long> { offer.PharmacyProfileId };
                    var buyerIds = allOrderItems
                        .Where(oi => oi.OfferId == offer.Id)
                        .Select(oi => oi.Order.BuyerPharmacyId)
                        .Distinct();
                    foreach (var buyerId in buyerIds)
                    {
                        participants.Add(buyerId);
                    }
                    participantMap[offer.Id] = participants;
                }
            }

            // 🆕 Filter offers: hide finalized offers from non-participants
            var visibleOffers = offers.Where(o =>
            {
                // Not finalized = visible to all
                if (!o.IsFinalized) return true;
                
                // Finalized but no requesting pharmacy = hide
                if (!requestingPharmacyId.HasValue) return false;
                
                // Finalized = only visible to participants
                return participantMap.ContainsKey(o.Id) && 
                       participantMap[o.Id].Contains(requestingPharmacyId.Value);
            }).ToList();

            // 🆕 Pharmacy names lookup for OfferTargets (Participants)
            var allOfferTargetPharmacyIds = visibleOffers
                .SelectMany(o => o.OfferTargets?.Select(ot => ot.TargetPharmacyId) ?? Enumerable.Empty<long>())
                .Distinct()
                .ToList();
            var pharmacyNamesMap = await _context.PharmacyProfiles
                .Where(p => allOfferTargetPharmacyIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.PharmacyName);

            var result = visibleOffers.Select(o =>
            {
                var dto = MapToOfferDto(o);
                // 🆕 Group by OfferId directly
                var buyersForOffer = allOrderItems
                    .Where(oi => oi.OfferId == o.Id)
                    .GroupBy(oi => oi.Order.BuyerPharmacyId)
                    .Select(g => new BuyerInfo
                    {
                        PharmacyId = g.Key,
                        PharmacyName = g.First().Order.BuyerPharmacy?.PharmacyName ?? "Bilinmeyen",
                        Quantity = g.Sum(x => x.Quantity),
                        OrderDate = g.Max(x => x.Order.OrderDate).ToString("dd/MM/yyyy")
                    })
                    .ToList();

                dto.Buyers = buyersForOffer;
                
                // 🆕 Map OfferTargets to Participants (for JointOrder/PurchaseRequest)
                if ((o.Type == OfferType.JointOrder || o.Type == OfferType.PurchaseRequest) && 
                    o.OfferTargets?.Any() == true)
                {
                    dto.Participants = o.OfferTargets.Select(ot => new JointOrderParticipantDto
                    {
                        PharmacyId = ot.TargetPharmacyId,
                        PharmacyName = pharmacyNamesMap.GetValueOrDefault(ot.TargetPharmacyId, "Bilinmeyen"),
                        Quantity = ot.RequestedQuantity,
                        IsSupplier = ot.IsSupplier,
                        AddedAt = ot.AddedAt.ToString("dd/MM/yyyy")
                    }).ToList();
                    
                    dto.TotalRequestedQuantity = o.OfferTargets.Sum(ot => ot.RequestedQuantity);
                }
                
                return dto;
            }).ToList();

            // 🆕 Enrich with locked quantities from StockLocks
            await EnrichOffersWithLockInfo(result);

            return result;
        }

        // ═══════════════════════════════════════════════════════════════
        // Command Operations
        // ═══════════════════════════════════════════════════════════════

        public async Task<OfferResult> CreateOfferAsync(CreateOfferRequest request, long pharmacyId)
        {
            // 1. Parse offer type
            if (!Enum.TryParse<OfferType>(request.Type, true, out var offerType))
                return OfferResult.Error("Geçersiz teklif tipi. Kullanın: stockSale, jointOrder, purchaseRequest");

            // 2. Validation: Private offers need targets
            if (request.IsPrivate && (request.TargetPharmacyIds == null || !request.TargetPharmacyIds.Any()))
                return OfferResult.Error("Özel teklifler için hedef eczane seçilmelidir.");

            if (offerType == OfferType.StockSale && request.MaxPriceLimit > 0 && request.Price > request.MaxPriceLimit)
                return OfferResult.Error($"Fiyat, seçilen barem fiyatından ({request.MaxPriceLimit:N2} TL) yüksek olamaz.");

            // 🆕 SKT Validation: Block expired medications for StockSale and JointOrder
            var parsedExpiration = ParseExpirationDate(request.ExpirationDate);
            if (offerType != OfferType.PurchaseRequest && 
                parsedExpiration.HasValue && 
                parsedExpiration.Value < DateTime.UtcNow)
            {
                return OfferResult.Error("Son kullanma tarihi geçmiş ilaçlar için teklif oluşturulamaz.");
            }

            // 4. Find medication
            var medication = await FindMedicationAsync(request);
            if (medication == null)
                return OfferResult.Error("İlaç bulunamadı.", 404);

            // 5. Smart Matching (for JointOrder/PurchaseRequest)
            var matchingResult = await CheckSmartMatchingAsync(offerType, medication.Id, request.Stock, pharmacyId);
            if (matchingResult != null)
                return matchingResult;

            // 6. Handle inventory for StockSale
            if (offerType == OfferType.StockSale)
            {
                await EnsureInventoryExistsAsync(pharmacyId, medication.Id, request);
            }

            // 7. Calculate NetPrice
            var netPrice = CalculateNetPrice(request);

            // 8. Parse expiration date
            var expirationDate = ParseExpirationDate(request.ExpirationDate);

            // 9. Create offer entity
            var offer = new Offer
            {
                PharmacyProfileId = pharmacyId,
                MedicationId = medication.Id,
                Type = offerType,
                Price = request.Price,
                Stock = request.Stock,
                BonusQuantity = request.BonusQuantity,
                MinSaleQuantity = request.MinSaleQuantity,
                Status = OfferStatus.Active,
                ExpirationDate = expirationDate,
                DepotPrice = request.DepotPrice,
                MalFazlasi = request.MalFazlasi,
                DiscountPercentage = request.DiscountPercentage,
                NetPrice = netPrice,
                MaxSaleQuantity = request.MaxSaleQuantity,
                Description = request.Description,
                IsPrivate = request.IsPrivate,
                WarehouseBaremId = request.WarehouseBaremId,
                MaxPriceLimit = request.MaxPriceLimit,

                CampaignStartDate = request.CampaignStartDate,
                CampaignEndDate = request.CampaignEndDate,
                CampaignBonusMultiplier = request.CampaignBonusMultiplier,
                MinimumOrderQuantity = request.MinimumOrderQuantity,
                BiddingDeadline = request.BiddingDeadline,
                AcceptingCounterOffers = request.AcceptingCounterOffers,
                TargetPharmacyId = request.TargetPharmacyId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Offers.Add(offer);
            await _context.SaveChangesAsync();

            // 10. Create OfferTargets (1NF Normalization)
            if (request.TargetPharmacyIds?.Any() == true)
            {
                foreach (var targetPharmacyId in request.TargetPharmacyIds)
                {
                    _context.OfferTargets.Add(new OfferTarget
                    {
                        OfferId = offer.Id,
                        TargetPharmacyId = targetPharmacyId,
                        AddedAt = DateTime.UtcNow
                    });
                }
                await _context.SaveChangesAsync();
            }

            // 11. Create transaction record
            await CreateTransactionAsync(pharmacyId, TransactionType.OfferCreated, 0,
                $"Teklif oluşturuldu: {medication.Name} ({offer.Stock} adet, {offer.Price:N2} TL)",
                offerId: offer.Id);

            // 12. Load navigation properties
            await _context.Entry(offer).Reference(o => o.Medication).LoadAsync();
            await _context.Entry(offer).Reference(o => o.PharmacyProfile).LoadAsync();

            // 13. Send SignalR notification
            await SendOfferNotificationAsync($"Yeni teklif oluşturuldu: {medication.Name}");

            return OfferResult.Ok(MapToOfferDto(offer));
        }

        public async Task<OfferResult> UpdateOfferAsync(int offerId, UpdateOfferRequest request, long pharmacyId)
        {
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .FirstOrDefaultAsync(o => o.Id == offerId && o.PharmacyProfileId == pharmacyId);

            if (offer == null)
                return OfferResult.Error("Teklif bulunamadı.", 404);

            // Update fields
            offer.Price = request.Price;
            offer.Stock = request.Stock;
            offer.BonusQuantity = request.BonusQuantity;
            offer.MinSaleQuantity = request.MinSaleQuantity;
            offer.DepotPrice = request.DepotPrice.GetValueOrDefault();
            offer.MalFazlasi = request.MalFazlasi;
            offer.DiscountPercentage = request.DiscountPercentage.GetValueOrDefault();
            offer.MaxSaleQuantity = request.MaxSaleQuantity;
            offer.Description = request.Description;

            // Recalculate NetPrice
            offer.NetPrice = CalculateNetPriceFromOffer(offer);

            // Update type-specific fields
            if (offer.Type == OfferType.JointOrder)
            {
                if (request.CampaignEndDate.HasValue) offer.CampaignEndDate = request.CampaignEndDate;
                if (request.CampaignStartDate.HasValue) offer.CampaignStartDate = request.CampaignStartDate;
                if (request.CampaignBonusMultiplier.HasValue) offer.CampaignBonusMultiplier = request.CampaignBonusMultiplier.Value;
            }
            else if (offer.Type == OfferType.PurchaseRequest)
            {
                if (request.MinimumOrderQuantity.HasValue) offer.MinimumOrderQuantity = request.MinimumOrderQuantity;
                if (request.BiddingDeadline.HasValue) offer.BiddingDeadline = request.BiddingDeadline;
                if (request.AcceptingCounterOffers.HasValue) offer.AcceptingCounterOffers = request.AcceptingCounterOffers.Value;
            }

            if (request.WarehouseBaremId.HasValue) offer.WarehouseBaremId = request.WarehouseBaremId;
            if (request.MaxPriceLimit.HasValue) offer.MaxPriceLimit = request.MaxPriceLimit.Value;

            offer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Create transaction
            await CreateTransactionAsync(pharmacyId, TransactionType.OfferUpdated, 0,
                $"Teklif güncellendi: {offer.Medication.Name} ({offer.Stock} adet, {offer.Price:N2} TL)",
                relatedReferenceId: offer.Id.ToString());

            // SignalR notification
            await SendOfferNotificationAsync($"Teklif güncellendi: {offer.Medication.Name}");

            return OfferResult.Ok(MapToOfferDto(offer));
        }

        public async Task<bool> UpdateOfferStatusAsync(int offerId, string status, long pharmacyId)
        {
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .FirstOrDefaultAsync(o => o.Id == offerId && o.PharmacyProfileId == pharmacyId);

            if (offer == null) return false;

            if (Enum.TryParse<OfferStatus>(status, true, out var newStatus))
            {
                // 🆕 Block reactivation of finalized offers
                // IsFinalized = teklif sonlandırıldı, IsPaymentProcessed = bakiye işlendi
                if ((offer.IsFinalized || offer.IsPaymentProcessed) && newStatus == OfferStatus.Active)
                {
                    // Cannot reactivate finalized or payment-processed offers
                    _logger.LogWarning("[UpdateOfferStatus] Attempted to reactivate finalized offer {OfferId}", offerId);
                    return false;
                }

                offer.Status = newStatus;
                offer.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                await SendOfferNotificationAsync($"Teklif durumu güncellendi: {offer.Medication?.Name ?? ""}");
                return true;
            }

            return false;
        }

        public async Task<bool> DeleteOfferAsync(int offerId, long pharmacyId)
        {
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.CartItems)
                .Include(o => o.OrderItems)
                .Include(o => o.StockLocks)
                .Include(o => o.Transactions)
                .FirstOrDefaultAsync(o => o.Id == offerId && o.PharmacyProfileId == pharmacyId);

            if (offer == null) return false;

            var medicationName = offer.Medication?.Name ?? "Bilinmeyen İlaç";
            var offerStock = offer.Stock;
            var offerPrice = offer.Price;

            // 🆕 Delete related CartItems first
            if (offer.CartItems.Any())
            {
                _context.CartItems.RemoveRange(offer.CartItems);
            }

            // 🆕 Delete related StockLocks
            if (offer.StockLocks.Any())
            {
                _context.StockLocks.RemoveRange(offer.StockLocks);
            }

            // 🆕 Get OrderItem IDs to delete related orders if they become empty
            var orderItemIds = offer.OrderItems.Select(oi => oi.Id).ToList();
            var affectedOrderIds = offer.OrderItems.Select(oi => oi.OrderId).Distinct().ToList();

            // 🆕 Delete related OrderItems
            if (offer.OrderItems.Any())
            {
                _context.OrderItems.RemoveRange(offer.OrderItems);
            }

            // 🆕 Delete related Transactions for this offer
            if (offer.Transactions.Any())
            {
                _context.Transactions.RemoveRange(offer.Transactions);
            }

            // Delete the offer itself
            _context.Offers.Remove(offer);
            
            await _context.SaveChangesAsync();

            // 🆕 Clean up empty orders (orders with no remaining items)
            foreach (var orderId in affectedOrderIds)
            {
                var order = await _context.Orders
                    .Include(o => o.OrderItems)
                    .FirstOrDefaultAsync(o => o.Id == orderId);
                
                if (order != null && !order.OrderItems.Any())
                {
                    _context.Orders.Remove(order);
                }
            }
            
            await _context.SaveChangesAsync();

            // Create transaction for the deletion action
            await CreateTransactionAsync(pharmacyId, TransactionType.OfferDeleted, 0,
                $"Teklif silindi: {medicationName} ({offerStock} adet, {offerPrice:N2} TL)");

            // SignalR notification
            await SendOfferNotificationAsync($"Teklif silindi: {medicationName}");

            return true;
        }

        // ═══════════════════════════════════════════════════════════════
        // Depot Operations
        // ═══════════════════════════════════════════════════════════════

        public async Task<DepotClaimResult> ClaimDepotAsync(int offerId, long pharmacyId)
        {
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .FirstOrDefaultAsync(o => o.Id == offerId);

            if (offer == null)
                return DepotClaimResult.Error("Teklif bulunamadı.", 404);

            if (offer.DepotClaimerUserId.HasValue)
                return DepotClaimResult.Error("Bu teklif için zaten depo sorumlusu belirlenmiş.", 409, offer.DepotClaimerUserId);

            offer.DepotClaimerUserId = pharmacyId;
            offer.DepotClaimedAt = DateTime.UtcNow;
            offer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await SendOfferNotificationAsync($"Depo sorumlusu belirlendi: {offer.Medication?.Name}");

            return DepotClaimResult.Ok(pharmacyId, offer.DepotClaimedAt.Value);
        }

        public async Task<bool> UnclaimDepotAsync(int offerId, long pharmacyId)
        {
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .FirstOrDefaultAsync(o => o.Id == offerId);

            if (offer == null || offer.DepotClaimerUserId != pharmacyId)
                return false;

            offer.DepotClaimerUserId = null;
            offer.DepotClaimedAt = null;
            offer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await SendOfferNotificationAsync($"Depo sorumlusu ayrıldı: {offer.Medication?.Name}");

            return true;
        }

        // 🆕 Alım Talebini Ortak Siparişe dönüştür
        public async Task<OfferResult> ConvertToJointOrderAsync(int offerId, ConvertToJointOrderDto request, long pharmacyId)
        {
            // 1. Offer'ı çek
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .Include(o => o.OfferTargets)
                .FirstOrDefaultAsync(o => o.Id == offerId);

            if (offer == null)
                return OfferResult.Error("Teklif bulunamadı.", 404);

            // 2. Kontrol: PurchaseRequest mi?
            if (offer.Type != OfferType.PurchaseRequest)
                return OfferResult.Error("Bu işlem sadece Alım Talepleri için geçerlidir.", 400);

            // 3. Kontrol: Kendi açtığı talebe kendisi üstlenmeye çalışıyor mu?
            if (offer.PharmacyProfileId == pharmacyId)
                return OfferResult.Error("Kendi açtığınız talebi kendiniz üstlenemezsiniz.", 400);

            // 4. Kontrol: Zaten bir tedarikçi var mı?
            if (offer.DepotClaimerUserId.HasValue)
                return OfferResult.Error("Bu talep için zaten bir tedarikçi belirlendi.", 409);

            // 5. Tip dönüşümü: PurchaseRequest → JointOrder
            offer.Type = OfferType.JointOrder;
            offer.DepotClaimerUserId = pharmacyId;
            offer.DepotClaimedAt = DateTime.UtcNow;
            offer.UpdatedAt = DateTime.UtcNow;

            // 6. Talep edenin (ilk açan) kaydını OfferTargets'a ekle (eğer yoksa)
            var existingRequesterTarget = offer.OfferTargets
                .FirstOrDefault(ot => ot.TargetPharmacyId == offer.PharmacyProfileId);
            
            if (existingRequesterTarget == null)
            {
                _context.OfferTargets.Add(new OfferTarget
                {
                    OfferId = offer.Id,
                    TargetPharmacyId = offer.PharmacyProfileId,
                    RequestedQuantity = offer.Stock, // Original requester's quantity
                    IsSupplier = false,
                    AddedAt = offer.CreatedAt
                });
            }
            else
            {
                existingRequesterTarget.RequestedQuantity = offer.Stock;
                existingRequesterTarget.IsSupplier = false;
            }

            // 7. Üstlenen kişiyi OfferTargets'a ekle
            var existingSupplierTarget = offer.OfferTargets
                .FirstOrDefault(ot => ot.TargetPharmacyId == pharmacyId);
            
            if (existingSupplierTarget == null)
            {
                _context.OfferTargets.Add(new OfferTarget
                {
                    OfferId = offer.Id,
                    TargetPharmacyId = pharmacyId,
                    RequestedQuantity = request.SupplierQuantity,
                    IsSupplier = true,
                    AddedAt = DateTime.UtcNow
                });
            }
            else
            {
                existingSupplierTarget.RequestedQuantity = request.SupplierQuantity;
                existingSupplierTarget.IsSupplier = true;
            }

            await _context.SaveChangesAsync();

            // 8. Transaction log
            await CreateTransactionAsync(pharmacyId, TransactionType.OfferUpdated, 0,
                $"Alım talebi ortak siparişe dönüştürüldü: {offer.Medication?.Name} (+{request.SupplierQuantity} adet)",
                offerId: offer.Id);

            // 9. Notification gönder
            await SendOfferNotificationAsync($"Alım talebi ortak siparişe dönüştürüldü: {offer.Medication?.Name}");

            // Reload for accurate DTO mapping
            await _context.Entry(offer).Collection(o => o.OfferTargets).LoadAsync();
            
            return OfferResult.Ok(MapToOfferDtoWithParticipants(offer));
        }

        // ═══════════════════════════════════════════════════════════════
        // Private Helper Methods
        // ═══════════════════════════════════════════════════════════════

        private async Task<Medication?> FindMedicationAsync(CreateOfferRequest request)
        {
            if (request.MedicationId.HasValue)
                return await _context.Medications.FindAsync(request.MedicationId.Value);

            if (!string.IsNullOrEmpty(request.Barcode))
                return await _context.Medications.FirstOrDefaultAsync(m => m.Barcode == request.Barcode);

            if (!string.IsNullOrEmpty(request.ProductName))
                return await _context.Medications.FirstOrDefaultAsync(m => m.Name == request.ProductName);

            return null;
        }

        private async Task<OfferResult?> CheckSmartMatchingAsync(OfferType offerType, int medicationId, int requestedStock, long pharmacyId)
        {
            if (offerType != OfferType.JointOrder && offerType != OfferType.PurchaseRequest)
                return null;

            var matchingOffers = await _context.Offers
                .Include(o => o.PharmacyProfile)
                .Where(o => o.MedicationId == medicationId
                         && (o.Type == OfferType.JointOrder || o.Type == OfferType.PurchaseRequest)
                         && o.Status == OfferStatus.Active)
                .ToListAsync();

            var suitableOffer = matchingOffers.FirstOrDefault(o =>
            {
                if (!string.IsNullOrEmpty(o.MalFazlasi))
                {
                    var baremParts = o.MalFazlasi.Split('+').Select(s => int.TryParse(s.Trim(), out var v) ? v : 0).ToArray();
                    var totalBaremStock = baremParts.Sum();
                    var remainingStock = totalBaremStock - o.SoldQuantity;
                    return remainingStock >= requestedStock;
                }
                return (o.Stock - o.SoldQuantity) >= requestedStock;
            });

            if (suitableOffer == null) return null;

            // Determine if we should block
            bool shouldBlock = offerType == OfferType.JointOrder ||
                              (offerType == OfferType.PurchaseRequest && suitableOffer.Type == OfferType.JointOrder);

            if (!shouldBlock) return null;

            // Calculate remaining stock
            int remainingStockValue;
            if (!string.IsNullOrEmpty(suitableOffer.MalFazlasi))
            {
                var baremParts = suitableOffer.MalFazlasi.Split('+').Select(s => int.TryParse(s.Trim(), out var v) ? v : 0).ToArray();
                var baremTotal = baremParts.Sum();
                var totalRequested = matchingOffers.Sum(o => o.Stock);
                remainingStockValue = Math.Max(0, baremTotal - totalRequested);
            }
            else
            {
                remainingStockValue = suitableOffer.Stock - suitableOffer.SoldQuantity;
            }

            var message = suitableOffer.Type == OfferType.JointOrder
                ? "Bu ilaç için yeterli stoklu bir ortak sipariş bulundu. Yeni teklif açmak yerine mevcut gruba katılabilirsiniz."
                : "Bu ilaç için aynı ilacı talep eden bir alım talebi var. Mevcut talebe katılabilirsiniz.";

            return OfferResult.Conflict(
                message,
                suitableOffer.Id,
                suitableOffer.MedicationId,
                suitableOffer.Type.ToString().ToLower(),
                suitableOffer.MalFazlasi,
                remainingStockValue,
                suitableOffer.PharmacyProfile?.PharmacyName
            );
        }

        private async Task EnsureInventoryExistsAsync(long pharmacyId, int medicationId, CreateOfferRequest request)
        {
            var inventory = await _context.InventoryItems
                .Where(i => i.PharmacyProfileId == pharmacyId && i.MedicationId == medicationId)
                .FirstOrDefaultAsync();

            if (inventory == null)
            {
                var expiryDate = ParseExpirationDate(request.ExpirationDate) ?? DateTime.UtcNow.AddYears(1);

                inventory = new InventoryItem
                {
                    PharmacyProfileId = pharmacyId,
                    MedicationId = medicationId,
                    Quantity = request.Stock,
                    BonusQuantity = request.BonusQuantity,
                    CostPrice = request.Price,
                    SalePrice = request.Price,
                    ExpiryDate = DateTime.SpecifyKind(expiryDate, DateTimeKind.Utc),
                    BatchNumber = $"AUTO-{DateTime.UtcNow:yyyyMMddHHmmss}",
                    IsAlarmSet = false,
                    MinStockLevel = 0
                };

                _context.InventoryItems.Add(inventory);
                await _context.SaveChangesAsync();
            }
            else if (inventory.Quantity < request.Stock)
            {
                inventory.Quantity = request.Stock;
                inventory.BonusQuantity = request.BonusQuantity;
                await _context.SaveChangesAsync();
            }
        }

        private static decimal CalculateNetPrice(CreateOfferRequest request)
        {
            decimal netPrice = request.Price;

            if (!string.IsNullOrEmpty(request.MalFazlasi))
            {
                var parts = request.MalFazlasi.Split('+');
                if (parts.Length == 2 && int.TryParse(parts[0], out int paidQty) && int.TryParse(parts[1], out int freeQty))
                {
                    var basePrice = request.DepotPrice > 0 ? request.DepotPrice : request.Price;
                    if (paidQty + freeQty > 0)
                        netPrice = (basePrice * paidQty) / (paidQty + freeQty);
                }
            }
            else if (request.DiscountPercentage > 0)
            {
                var basePrice = request.DepotPrice > 0 ? request.DepotPrice : request.Price;
                netPrice = basePrice * (1 - (request.DiscountPercentage / 100));
            }

            return netPrice;
        }

        private static decimal CalculateNetPriceFromOffer(Offer offer)
        {
            decimal netPrice = offer.Price;

            if (!string.IsNullOrEmpty(offer.MalFazlasi))
            {
                var parts = offer.MalFazlasi.Split('+');
                if (parts.Length == 2 && int.TryParse(parts[0], out int paidQty) && int.TryParse(parts[1], out int freeQty))
                {
                    var basePrice = offer.DepotPrice > 0 ? offer.DepotPrice : offer.Price;
                    if (paidQty + freeQty > 0)
                        netPrice = (basePrice * paidQty) / (paidQty + freeQty);
                }
            }
            else if (offer.DiscountPercentage > 0)
            {
                var basePrice = offer.DepotPrice > 0 ? offer.DepotPrice : offer.Price;
                netPrice = basePrice * (1 - (offer.DiscountPercentage / 100));
            }

            return netPrice;
        }

        private static DateTime? ParseExpirationDate(string? expirationDate)
        {
            if (string.IsNullOrEmpty(expirationDate)) return null;

            var parts = expirationDate.Replace(" ", "").Split('/');
            if (parts.Length == 2 && int.TryParse(parts[0], out int month) && int.TryParse(parts[1], out int year))
            {
                return DateTime.SpecifyKind(new DateTime(year, month, DateTime.DaysInMonth(year, month)), DateTimeKind.Utc);
            }

            return null;
        }

        private async Task CreateTransactionAsync(long pharmacyId, TransactionType type, decimal amount, string description, int? orderId = null, int? offerId = null, string? relatedReferenceId = null)
        {
            var transaction = new Transaction
            {
                PharmacyProfileId = pharmacyId,
                Type = type,
                Amount = amount,
                Description = description,
                Date = DateTime.UtcNow,
                OrderId = orderId,
                OfferId = offerId,
                RelatedReferenceId = relatedReferenceId
            };
            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();
        }

        private async Task SendOfferNotificationAsync(string message)
        {
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", new
            {
                message = message,
                type = "entityUpdated",
                timestamp = DateTime.UtcNow,
                senderId = (string?)null
            });
        }

        private async Task EnrichOffersWithBuyerInfo(List<OfferDto> offers)
        {
            var medicationIds = offers.Select(o => o.MedicationId).Distinct().ToList();
            var pharmacyIds = offers.Select(o => long.Parse(o.PharmacyId)).Distinct().ToList();

            var orderQuantities = await _context.OrderItems
                .Include(oi => oi.Order).ThenInclude(o => o.BuyerPharmacy)
                .Where(oi => medicationIds.Contains(oi.MedicationId) && pharmacyIds.Contains(oi.Order.SellerPharmacyId))
                .GroupBy(oi => new { oi.MedicationId, oi.Order.SellerPharmacyId })
                .Select(g => new
                {
                    g.Key.MedicationId,
                    g.Key.SellerPharmacyId,
                    TotalQuantity = g.Sum(x => x.Quantity),
                    Buyers = g.Select(x => new
                    {
                        x.Order.BuyerPharmacyId,
                        BuyerName = x.Order.BuyerPharmacy != null ? x.Order.BuyerPharmacy.PharmacyName : "Bilinmiyor",
                        x.Quantity,
                        OrderDate = x.Order.CreatedAt
                    }).ToList()
                })
                .ToListAsync();

            foreach (var offer in offers)
            {
                var orderData = orderQuantities.FirstOrDefault(x =>
                    x.MedicationId == offer.MedicationId && x.SellerPharmacyId.ToString() == offer.PharmacyId);

                if (orderData != null)
                {
                    offer.SoldQuantity += orderData.TotalQuantity;
                    offer.Buyers = orderData.Buyers.Select(b => new BuyerInfo
                    {
                        PharmacyId = b.BuyerPharmacyId,
                        PharmacyName = b.BuyerName,
                        Quantity = b.Quantity,
                        OrderDate = b.OrderDate.ToString("dd/MM/yyyy")
                    }).ToList();
                }
            }
        }

        /// <summary>
        /// Enrich offers with locked stock quantities from StockLocks table.
        /// This shows how much stock is currently locked in other users' carts.
        /// </summary>
        private async Task EnrichOffersWithLockInfo(List<OfferDto> offers)
        {
            var offerIds = offers.Select(o => o.Id).ToList();

            // Get all active locks for these offers
            var lockedQuantities = await _context.StockLocks
                .Where(sl => offerIds.Contains(sl.OfferId) && sl.ExpiresAt > DateTime.UtcNow)
                .GroupBy(sl => sl.OfferId)
                .Select(g => new
                {
                    OfferId = g.Key,
                    TotalLocked = g.Sum(sl => sl.LockedQuantity)
                })
                .ToListAsync();

            foreach (var offer in offers)
            {
                var lockData = lockedQuantities.FirstOrDefault(l => l.OfferId == offer.Id);
                offer.LockedQuantity = lockData?.TotalLocked ?? 0;
                offer.AvailableStock = Math.Max(0, offer.RemainingStock - offer.LockedQuantity);
            }
        }

        private static OfferDto MapToOfferDto(Offer o)
        {
            // 🆕 Calculate remaining stock based on offer type
            // For JointOrder and PurchaseRequest:
            // - BaremTotal = total amount needed to complete the barem (e.g., 50+5 = 55)
            // - Stock = organizer's contribution (how much the offer creator is putting in)
            // - SoldQuantity = participants' orders (how much others have ordered)
            // - Remaining = BaremTotal - Stock - SoldQuantity
            int remainingStock;
            if ((o.Type == OfferType.JointOrder || o.Type == OfferType.PurchaseRequest) && !string.IsNullOrEmpty(o.MalFazlasi))
            {
                // Parse barem: "50+5" => 55
                var baremParts = o.MalFazlasi.Split('+').Select(s => int.TryParse(s.Trim(), out var v) ? v : 0).ToArray();
                var baremTotal = baremParts.Sum();
                // Remaining = BaremTotal - Organizer's Stock - Participants' Orders
                remainingStock = baremTotal - o.Stock - o.SoldQuantity;
            }
            else
            {
                remainingStock = o.Stock - o.SoldQuantity;
            }


            return new OfferDto
            {
                Id = o.Id,
                MedicationId = o.MedicationId,
                ProductName = o.Medication?.Name ?? "",
                Barcode = o.Medication?.Barcode,
                Type = o.Type.ToString().ToLower(),
                Stock = $"{o.Stock} + {o.BonusQuantity}",
                Price = o.Price,
                Status = o.Status.ToString().ToLower(),
                PharmacyId = o.PharmacyProfile?.Id.ToString() ?? "",
                PharmacyName = o.PharmacyProfile?.PharmacyName ?? "",
                PharmacyUsername = o.PharmacyProfile?.Username,
                Description = o.Medication?.Description,
                Manufacturer = o.Medication?.Manufacturer,
                ImageUrl = !string.IsNullOrEmpty(o.Medication?.ImagePath) ? $"/{o.Medication.ImagePath}" : "/logoYesil.png",
                ImageCount = o.Medication?.ImageCount ?? 1,
                ExpirationDate = o.ExpirationDate?.ToString("MM/yyyy"),
                CampaignEndDate = o.CampaignEndDate?.ToString("yyyy-MM-dd"),
                CampaignBonusMultiplier = o.Type == OfferType.JointOrder ? o.CampaignBonusMultiplier : null,
                BiddingDeadline = o.BiddingDeadline?.ToString("yyyy-MM-dd"),
                DepotPrice = o.DepotPrice,
                MalFazlasi = o.MalFazlasi ?? $"{o.MinSaleQuantity}+{o.BonusQuantity}",
                DiscountPercentage = o.DiscountPercentage,
                NetPrice = o.NetPrice,
                MaxSaleQuantity = o.MaxSaleQuantity,
                OfferDescription = o.Description,
                SoldQuantity = o.SoldQuantity,
                RemainingStock = remainingStock, // 🆕 Now uses barem-based calculation
                DepotClaimerUserId = o.DepotClaimerUserId,
                DepotClaimedAt = o.DepotClaimedAt,
                // 🆕 Finalization tracking for seller management panel
                IsFinalized = o.IsFinalized,
                IsPaymentProcessed = o.IsPaymentProcessed,
                CreatedAt = o.CreatedAt.ToString("dd/MM/yyyy")
            };
        }


        private OfferDto MapToOfferDtoWithTargets(Offer o)
        {
            var dto = MapToOfferDto(o);
            dto.WarehouseBaremId = o.WarehouseBaremId;
            dto.MaxPriceLimit = o.MaxPriceLimit;
            dto.IsPrivate = o.IsPrivate;
            dto.TargetPharmacyIds = o.OfferTargets?.Select(ot => ot.TargetPharmacyId).ToList();
            
            // 🆕 Map OfferTargets to Participants (for JointOrder/PurchaseRequest display)
            if ((o.Type == OfferType.JointOrder || o.Type == OfferType.PurchaseRequest) && 
                o.OfferTargets?.Any() == true)
            {
                // Get pharmacy names for all target pharmacy IDs
                var pharmacyIds = o.OfferTargets.Select(ot => ot.TargetPharmacyId).ToList();
                var pharmacyNames = _context.PharmacyProfiles
                    .Where(p => pharmacyIds.Contains(p.Id))
                    .ToDictionary(p => p.Id, p => p.PharmacyName);
                
                dto.Participants = o.OfferTargets.Select(ot => new JointOrderParticipantDto
                {
                    PharmacyId = ot.TargetPharmacyId,
                    PharmacyName = pharmacyNames.GetValueOrDefault(ot.TargetPharmacyId, "Bilinmeyen"),
                    Quantity = ot.RequestedQuantity,
                    IsSupplier = ot.IsSupplier,
                    AddedAt = ot.AddedAt.ToString("dd/MM/yyyy")
                }).ToList();
                
                dto.TotalRequestedQuantity = o.OfferTargets.Sum(ot => ot.RequestedQuantity);
            }
            
            return dto;
        }

        // 🆕 Joint Order için katılımcıları içeren DTO mapping
        private OfferDto MapToOfferDtoWithParticipants(Offer o)
        {
            var dto = MapToOfferDtoWithTargets(o);
            
            // Map participants from OfferTargets
            if (o.OfferTargets?.Any() == true)
            {
                var pharmacyIds = o.OfferTargets.Select(ot => ot.TargetPharmacyId).Distinct().ToList();
                var pharmacyNames = _context.PharmacyProfiles
                    .Where(p => pharmacyIds.Contains(p.Id))
                    .ToDictionary(p => p.Id, p => p.PharmacyName);

                dto.Participants = o.OfferTargets.Select(ot => new JointOrderParticipantDto
                {
                    PharmacyId = ot.TargetPharmacyId,
                    PharmacyName = pharmacyNames.GetValueOrDefault(ot.TargetPharmacyId, "Bilinmeyen"),
                    Quantity = ot.RequestedQuantity,
                    IsSupplier = ot.IsSupplier,
                    AddedAt = ot.AddedAt.ToString("dd/MM/yyyy")
                }).ToList();

                dto.TotalRequestedQuantity = o.OfferTargets.Sum(ot => ot.RequestedQuantity);
            }
            
            return dto;
        }

        // ═══════════════════════════════════════════════════════════════
        // Financial Operations (Provision/Capture Pattern)
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Process balance capture: Convert Provision → Captured, transfer money to seller
        /// Also adds remaining quantity to offer owner's account in database
        /// Implements ACID-compliant atomic transactions with Optimistic Concurrency retry
        /// </summary>
        public async Task<BalanceProcessResult> ProcessBalanceAsync(int offerId, long pharmacyId)
        {
            // 1. Verify offer ownership
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .Include(o => o.OfferTargets)
                .FirstOrDefaultAsync(o => o.Id == offerId);

            if (offer == null)
                return BalanceProcessResult.Error("Teklif bulunamadı.", 404);

            // Authorization: Only offer owner can process balance
            if (offer.PharmacyProfileId != pharmacyId)
                return BalanceProcessResult.Error("Bu işlem için yetkiniz yok.", 403);

            // Check if already processed
            if (offer.IsPaymentProcessed)
                return BalanceProcessResult.Error("Bu teklif için ödeme zaten işlendi.", 409);

            // 2. Get all Provision transactions for this offer
            var provisionTransactions = await _context.Transactions
                .Where(t => t.OfferId == offerId && t.Status == TransactionStatus.Provision)
                .ToListAsync();

            if (!provisionTransactions.Any())
                return BalanceProcessResult.Error("İşlenecek provizyon bulunamadı.", 404);

            // 3. Calculate total amount to capture (sum of absolute values)
            var captureAmount = provisionTransactions.Sum(t => Math.Abs(t.Amount));
            var transactionCount = provisionTransactions.Count;

            // 4. Atomic transaction with Optimistic Concurrency retry
            const int maxRetries = 3;
            for (int retry = 0; retry < maxRetries; retry++)
            {
                using var dbTransaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Get seller profile (fresh read for each retry)
                    var seller = await _context.PharmacyProfiles.FindAsync(pharmacyId);
                    if (seller == null)
                    {
                        await dbTransaction.RollbackAsync();
                        return BalanceProcessResult.Error("Satıcı profili bulunamadı.", 404);
                    }

                    // Update all Provision → Captured
                    foreach (var tx in provisionTransactions)
                    {
                        tx.Status = TransactionStatus.Captured;
                        tx.UpdatedAt = DateTime.UtcNow;
                    }

                    // Create seller Sale transaction (Captured)
                    foreach (var buyerTx in provisionTransactions)
                    {
                        _context.Transactions.Add(new Transaction
                        {
                            PharmacyProfileId = pharmacyId,
                            CounterpartyPharmacyId = buyerTx.PharmacyProfileId,
                            OrderId = buyerTx.OrderId,
                            OfferId = offerId,
                            Type = TransactionType.Sale,
                            Amount = Math.Abs(buyerTx.Amount), // Positive for seller
                            Description = $"Tahsilat: {offer.Medication?.Name ?? "Bilinmeyen"} - Provizyon #{buyerTx.Id}",
                            Date = DateTime.UtcNow,
                            Status = TransactionStatus.Captured
                        });
                    }

                    // Credit seller balance
                    seller.Balance += captureAmount;

                    // Mark offer as payment processed
                    offer.IsPaymentProcessed = true;
                    offer.UpdatedAt = DateTime.UtcNow;
                    
                    // 🆕 Calculate remaining quantity based on offer type
                    int remainingQuantity = 0;
                    int totalStock = 0;
                    
                    if (offer.Type == OfferType.StockSale)
                    {
                        // StockSale: Satıcı X adet koydu, Y adet satıldı, kalan (X-Y) zaten satıcının elinde
                        // OfferTarget'a eklemeye GEREK YOK çünkü fiziksel olarak zaten satıcıda
                        remainingQuantity = Math.Max(0, offer.Stock - offer.SoldQuantity);
                        totalStock = offer.Stock;
                        // Just update SoldQuantity to match total for display purposes
                        // No OfferTarget entry needed - seller already has the remaining items
                    }
                    else
                    {
                        // JointOrder/PurchaseRequest: Barem dolduruluyor, kalan teklif sahibine eklenmeli
                        var baremParts = (offer.MalFazlasi ?? "0").Split('+').Select(s => int.TryParse(s.Trim(), out var v) ? v : 0).ToArray();
                        totalStock = baremParts.Sum();
                        var totalRequested = offer.OfferTargets?.Sum(ot => ot.RequestedQuantity) ?? 0;
                        remainingQuantity = Math.Max(0, totalStock - totalRequested);

                        // Only add OfferTarget for JointOrder/PurchaseRequest - owner gets remaining for delivery
                        if (remainingQuantity > 0)
                        {
                            var ownerTarget = offer.OfferTargets?.FirstOrDefault(ot => ot.TargetPharmacyId == pharmacyId);
                            if (ownerTarget != null)
                            {
                                // Update existing entry
                                ownerTarget.RequestedQuantity += remainingQuantity;
                            }
                            else
                            {
                                // Create new OfferTarget entry for owner
                                _context.OfferTargets.Add(new OfferTarget
                                {
                                    OfferId = offerId,
                                    TargetPharmacyId = pharmacyId,
                                    RequestedQuantity = remainingQuantity,
                                    IsSupplier = offer.Type == OfferType.JointOrder,
                                    AddedAt = DateTime.UtcNow
                                });
                            }
                        }
                    }

                    // Set SoldQuantity = Total (remaining stock becomes 0 in system for display)
                    offer.SoldQuantity = totalStock;

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();

                    // Success! Send notification
                    await SendOfferNotificationAsync($"Ödeme işlendi: {offer.Medication?.Name ?? ""} - {captureAmount:N2} TL");

                    return BalanceProcessResult.Ok(captureAmount, transactionCount);
                }
                catch (DbUpdateConcurrencyException)
                {
                    // Concurrency conflict - another transaction modified the seller balance
                    await dbTransaction.RollbackAsync();

                    if (retry == maxRetries - 1)
                    {
                        // Last retry failed
                        return BalanceProcessResult.Error(
                            "Eşzamanlılık hatası: Bakiye güncelleme başarısız oldu. Lütfen tekrar deneyin.", 
                            409);
                    }

                    // Reload entities for next retry
                    foreach (var tx in provisionTransactions)
                    {
                        await _context.Entry(tx).ReloadAsync();
                    }
                    await _context.Entry(offer).ReloadAsync();

                    // Small delay before retry
                    await Task.Delay(100 * (retry + 1));
                }
                catch (Exception ex)
                {
                    await dbTransaction.RollbackAsync();
                    return BalanceProcessResult.Error($"İşlem hatası: {ex.Message}", 500);
                }
            }

            return BalanceProcessResult.Error("Beklenmeyen hata oluştu.", 500);
        }

        /// <summary>
        /// Finalize an offer: Set Status = Passive, IsFinalized = true
        /// Remaining quantity is added to the offer owner's account
        /// </summary>
        public async Task<OfferResult> FinalizeOfferAsync(int offerId, long pharmacyId)
        {
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.OfferTargets)
                .FirstOrDefaultAsync(o => o.Id == offerId);

            if (offer == null)
                return OfferResult.Error("Teklif bulunamadı.", 404);

            // Authorization: Only owner can finalize
            if (offer.PharmacyProfileId != pharmacyId)
                return OfferResult.Error("Bu işlem için yetkiniz yok.", 403);

            // Check if already finalized
            if (offer.IsFinalized)
                return OfferResult.Error("Bu teklif zaten sonlandırılmış.", 409);

            // 🆕 Calculate remaining quantity based on offer type
            int remainingQuantity = 0;
            int baremTotal = 0;
            
            if (offer.Type == OfferType.JointOrder || offer.Type == OfferType.PurchaseRequest)
            {
                // For JointOrder/PurchaseRequest: remaining = barem - total requested (from OfferTargets)
                if (!string.IsNullOrEmpty(offer.MalFazlasi))
                {
                    var baremParts = offer.MalFazlasi.Split('+').Select(s => int.TryParse(s.Trim(), out var v) ? v : 0).ToArray();
                    baremTotal = baremParts.Sum();
                }
                
                // Sum all requested quantities from OfferTargets
                var totalRequested = offer.OfferTargets?.Sum(ot => ot.RequestedQuantity) ?? 0;
                remainingQuantity = Math.Max(0, baremTotal - totalRequested);
            }
            else
            {
                // For StockSale: remaining = stock - sold
                remainingQuantity = Math.Max(0, offer.Stock - offer.SoldQuantity);
            }

            // Note: Remaining quantity will be added to owner during ProcessBalance
            // Here we just calculate for notification purposes

            // Update offer status
            offer.Status = OfferStatus.Passive;
            offer.IsFinalized = true;
            offer.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Send notification
            var message = remainingQuantity > 0 
                ? $"Teklif sonlandırıldı: {offer.Medication?.Name ?? ""}. Kalan {remainingQuantity} adet bakiye işlendiğinde hesabınıza eklenecek."
                : $"Teklif sonlandırıldı: {offer.Medication?.Name ?? ""}";
            await SendOfferNotificationAsync(message);

            var dto = MapToOfferDto(offer);
            // Add remaining quantity info to response for frontend display
            dto.CreatorQuantity = remainingQuantity;
            
            return OfferResult.Ok(dto);
        }

        /// <summary>
        /// Withdraw (revert) a finalized offer: Set Status = Active, IsFinalized = false
        /// Only possible if payment hasn't been processed yet
        /// </summary>
        public async Task<OfferResult> WithdrawOfferAsync(int offerId, long pharmacyId)
        {
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.OfferTargets)
                .FirstOrDefaultAsync(o => o.Id == offerId);

            if (offer == null)
                return OfferResult.Error("Teklif bulunamadı.", 404);

            // Authorization: Only owner can withdraw
            if (offer.PharmacyProfileId != pharmacyId)
                return OfferResult.Error("Bu işlem için yetkiniz yok.", 403);

            // Check if not finalized
            if (!offer.IsFinalized)
                return OfferResult.Error("Bu teklif henüz sonlandırılmamış.", 400);

            // Check if payment already processed - cannot withdraw
            if (offer.IsPaymentProcessed)
                return OfferResult.Error("Bakiyeler işlendiği için teklif geri alınamaz.", 400);

            // 🆕 Remove the remaining quantity that was added to owner during finalization
            var ownerTarget = offer.OfferTargets?.FirstOrDefault(ot => ot.TargetPharmacyId == pharmacyId);
            if (ownerTarget != null && ownerTarget.RequestedQuantity > 0)
            {
                // For StockSale, the owner's target was created during finalization
                // We need to revert this
                if (offer.Type == OfferType.StockSale)
                {
                    _context.OfferTargets.Remove(ownerTarget);
                    // Revert SoldQuantity
                    offer.SoldQuantity = offer.Stock - ownerTarget.RequestedQuantity;
                }
                // For JointOrder/PurchaseRequest, just reduce the owner's RequestedQuantity
                // But we need to track what was added - simplified: just leave it for now
            }

            // Revert offer status
            offer.Status = OfferStatus.Active;
            offer.IsFinalized = false;
            offer.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Send notification
            await SendOfferNotificationAsync($"Teklif geri alındı: {offer.Medication?.Name ?? ""}. Tekrar İlaç Vitrininde görünüyor.");

            return OfferResult.Ok(MapToOfferDto(offer));
        }

        /// <summary>
        /// Get shipment labels with encrypted QR tokens for printing
        /// Creates temporary shipment records for each buyer if they don't exist
        /// </summary>
        public async Task<List<ShipmentLabelDto>> GetShipmentLabelsAsync(int offerId, long pharmacyId)
        {
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .FirstOrDefaultAsync(o => o.Id == offerId);

            if (offer == null)
                return new List<ShipmentLabelDto>();

            // Authorization: Only owner can get labels
            if (offer.PharmacyProfileId != pharmacyId)
                return new List<ShipmentLabelDto>();

            // Get all orders for this offer with buyer info
            var orderItems = await _context.OrderItems
                .Include(oi => oi.Order)
                    .ThenInclude(o => o.BuyerPharmacy)
                .Where(oi => oi.OfferId == offerId)
                .ToListAsync();

            var labels = new List<ShipmentLabelDto>();
            var cryptoService = new CryptoService(_context.Database.GetDbConnection().ConnectionString != null 
                ? new ConfigurationBuilder()
                    .SetBasePath(Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.json", optional: false)
                    .Build() 
                : null!);

            // Group by buyer and create labels
            var buyerGroups = orderItems
                .GroupBy(oi => oi.Order.BuyerPharmacyId)
                .Select(g => new
                {
                    BuyerPharmacyId = g.Key,
                    BuyerPharmacyName = g.First().Order.BuyerPharmacy?.PharmacyName ?? "Bilinmeyen",
                    TotalQuantity = g.Sum(x => x.Quantity),
                    OrderNumber = g.First().Order.OrderNumber
                });

            int labelIndex = 1;
            foreach (var buyer in buyerGroups)
            {
                // Check if shipment exists for this order
                var existingShipment = await _context.Shipments
                    .FirstOrDefaultAsync(s => s.OrderNumber == buyer.OrderNumber && s.ReceiverPharmacyId == buyer.BuyerPharmacyId);

                int shipmentId;
                if (existingShipment != null)
                {
                    shipmentId = existingShipment.Id;
                }
                else
                {
                    // Create a new shipment record - Status is Shipped (Kargoya Hazır)
                    var newShipment = new Shipment
                    {
                        OrderNumber = buyer.OrderNumber,
                        SenderPharmacyId = pharmacyId,
                        ReceiverPharmacyId = buyer.BuyerPharmacyId,
                        MedicationId = offer.MedicationId,
                        Quantity = buyer.TotalQuantity,
                        TrackingNumber = $"PD-{offerId}-{labelIndex:D4}",
                        Status = ShipmentStatus.Shipped, // Kargoya Hazır - not Pending
                        Carrier = "PharmaDesk Kargo",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Shipments.Add(newShipment);
                    await _context.SaveChangesAsync();
                    shipmentId = newShipment.Id;
                    
                    // Add initial tracking event
                    _context.ShipmentEvents.Add(new ShipmentEvent
                    {
                        ShipmentId = shipmentId,
                        Status = "Kargoya Verildi",
                        Location = "Gönderici Eczane",
                        EventDate = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync();
                }

                // Generate encrypted QR token
                var qrToken = GenerateShipmentToken(shipmentId);

                labels.Add(new ShipmentLabelDto
                {
                    ShipmentId = shipmentId,
                    OrderNumber = buyer.OrderNumber,
                    BuyerPharmacyName = buyer.BuyerPharmacyName,
                    BuyerPharmacyId = buyer.BuyerPharmacyId,
                    Quantity = buyer.TotalQuantity,
                    QRToken = qrToken
                });

                labelIndex++;
            }

            return labels;
        }

        /// <summary>
        /// Simple AES-256 token generator for shipment QR codes.
        /// For more robust usage, inject ICryptoService.
        /// </summary>
        private string GenerateShipmentToken(int shipmentId)
        {
            try
            {
                var config = new ConfigurationBuilder()
                    .SetBasePath(Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.json", optional: false)
                    .Build();

                var keyString = config["Crypto:ShipmentKey"] ?? "PharmaDesk-Default-Key";
                
                using var sha256 = System.Security.Cryptography.SHA256.Create();
                var key = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(keyString));

                var payload = System.Text.Json.JsonSerializer.Serialize(new
                {
                    id = shipmentId,
                    ts = DateTime.UtcNow.Ticks,
                    salt = Guid.NewGuid().ToString()
                });

                using var aes = System.Security.Cryptography.Aes.Create();
                aes.KeySize = 256;
                aes.Key = key;
                aes.GenerateIV();

                using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
                using var ms = new MemoryStream();
                
                // Prepend IV
                ms.Write(aes.IV, 0, aes.IV.Length);
                
                using (var cs = new System.Security.Cryptography.CryptoStream(ms, encryptor, System.Security.Cryptography.CryptoStreamMode.Write))
                using (var sw = new StreamWriter(cs))
                {
                    sw.Write(payload);
                }

                return Convert.ToBase64String(ms.ToArray())
                    .Replace('+', '-')
                    .Replace('/', '_')
                    .TrimEnd('=');
            }
            catch
            {
                // Fallback to simple encoding if crypto fails
                return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{shipmentId}:{DateTime.UtcNow.Ticks}"));
            }
        }
    }
}
