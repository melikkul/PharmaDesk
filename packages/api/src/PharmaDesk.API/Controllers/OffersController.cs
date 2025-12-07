using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PharmaDesk.API.Hubs;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OffersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;

        public OffersController(AppDbContext context, IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        // GET /api/offers - Tüm aktif teklifleri listele (Pazaryeri)
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<OfferDto>>> GetAllOffers(
            [FromQuery] string? status = "active",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var query = _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .AsQueryable();

            // Filter by status
            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<OfferStatus>(status, true, out var offerStatus))
                {
                    query = query.Where(o => o.Status == offerStatus);
                }
            }

            var offers = await query
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new OfferDto
                {
                    Id = o.Id,
                    MedicationId = o.MedicationId,
                    ProductName = o.Medication.Name,
                    Barcode = o.Medication.Barcode,
                    Type = o.Type.ToString().ToLower(),
                    Stock = $"{o.Stock} + {o.BonusQuantity}",
                    Price = o.Price,
                    Status = o.Status.ToString().ToLower(),
                    PharmacyId = o.PharmacyProfile.Id.ToString(),
                    PharmacyName = o.PharmacyProfile.PharmacyName,
                    PharmacyUsername = o.PharmacyProfile.Username,
                    Description = o.Medication.Description,
                    Manufacturer = o.Medication.Manufacturer,
                    ImageUrl = null, // Placeholder or add to DB later
                    ExpirationDate = o.ExpirationDate.HasValue ? o.ExpirationDate.Value.ToString("MM/yyyy") : null,
                    CampaignEndDate = o.CampaignEndDate.HasValue ? o.CampaignEndDate.Value.ToString("yyyy-MM-dd") : null,
                    CampaignBonusMultiplier = o.Type == OfferType.JointOrder ? o.CampaignBonusMultiplier : null,
                    BiddingDeadline = o.BiddingDeadline.HasValue ? o.BiddingDeadline.Value.ToString("yyyy-MM-dd") : null,
                    
                    // New fields
                    DepotPrice = o.DepotPrice,
                    MalFazlasi = o.MalFazlasi ?? $"{o.MinSaleQuantity}+{o.BonusQuantity}",
                    DiscountPercentage = o.DiscountPercentage,
                    NetPrice = o.NetPrice,
                    MaxSaleQuantity = o.MaxSaleQuantity,
                    OfferDescription = o.Description
                })
                .ToListAsync();

            return Ok(offers);
        }

        [HttpGet("my-offers")]
        public async Task<ActionResult<IEnumerable<OfferDto>>> GetMyOffers()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            
            // Throw detailed exception for debugging
            if (pharmacyId == null)
            {
                var allClaims = User.Claims.Select(c => $"{c.Type}={c.Value}").ToList();
                var claimsString = string.Join(", ", allClaims);
                throw new Exception($"GetPharmacyIdFromToken returned null. All claims: [{claimsString}]");
            }

            var offers = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .Where(o => o.PharmacyProfileId == pharmacyId.Value)
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => new OfferDto
                {
                    Id = o.Id,
                    MedicationId = o.MedicationId,
                    ProductName = o.Medication.Name,
                    Barcode = o.Medication.Barcode,
                    Type = o.Type.ToString().ToLower(),
                    Stock = $"{o.Stock} + {o.BonusQuantity}",
                    Price = o.Price,
                    Status = o.Status.ToString().ToLower(),
                    PharmacyId = o.PharmacyProfile.Id.ToString(),
                    PharmacyName = o.PharmacyProfile.PharmacyName,
                    PharmacyUsername = o.PharmacyProfile.Username,
                    Description = o.Medication.Description,
                    Manufacturer = o.Medication.Manufacturer,
                    ImageUrl = null,
                    ExpirationDate = o.ExpirationDate.HasValue ? o.ExpirationDate.Value.ToString("MM/yyyy") : null,
                    CampaignEndDate = o.CampaignEndDate.HasValue ? o.CampaignEndDate.Value.ToString("yyyy-MM-dd") : null,
                    CampaignBonusMultiplier = o.Type == OfferType.JointOrder ? o.CampaignBonusMultiplier : null,
                    BiddingDeadline = o.BiddingDeadline.HasValue ? o.BiddingDeadline.Value.ToString("yyyy-MM-dd") : null,
                    
                    // Financial fields
                    DepotPrice = o.DepotPrice,
                    MalFazlasi = o.MalFazlasi ?? $"{o.MinSaleQuantity}+{o.BonusQuantity}",
                    DiscountPercentage = o.DiscountPercentage,
                    NetPrice = o.NetPrice,
                    MaxSaleQuantity = o.MaxSaleQuantity,
                    OfferDescription = o.Description,
                    
                    // Barem and stock tracking
                    WarehouseBaremId = o.WarehouseBaremId,
                    MaxPriceLimit = o.MaxPriceLimit,
                    IsPrivate = o.IsPrivate,
                    TargetPharmacyIds = o.TargetPharmacyIds,
                    SoldQuantity = o.SoldQuantity,
                    RemainingStock = o.Stock - o.SoldQuantity
                })
                .ToListAsync();

            return Ok(offers);
        }

        // GET /api/offers/{id} - Teklif detayını getir (Owner check)
        [HttpGet("{id}")]
        public async Task<ActionResult<OfferDto>> GetOfferById(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (offer == null)
                return NotFound(new { message = "Offer not found" });

            // Authorization: Only owner can view their offers in edit mode
            // Non-owners can only view active public offers
            if (offer.PharmacyProfileId != pharmacyId)
            {
                // Allow viewing active public offers (marketplace)
                if (offer.Status != OfferStatus.Active || offer.IsPrivate)
                {
                    return Forbid();
                }
            }

            var response = new OfferDto
            {
                Id = offer.Id,
                MedicationId = offer.MedicationId,
                ProductName = offer.Medication.Name,
                Barcode = offer.Medication.Barcode,
                Type = offer.Type.ToString().ToLower(),
                Stock = $"{offer.Stock} + {offer.BonusQuantity}",
                Price = offer.Price,
                Status = offer.Status.ToString().ToLower(),
                PharmacyId = offer.PharmacyProfile.Id.ToString(),
                PharmacyName = offer.PharmacyProfile.PharmacyName,
                PharmacyUsername = offer.PharmacyProfile.Username,
                Description = offer.Medication.Description,
                Manufacturer = offer.Medication.Manufacturer,
                ImageUrl = null,
                ExpirationDate = offer.ExpirationDate.HasValue ? offer.ExpirationDate.Value.ToString("MM/yyyy") : null,
                CampaignEndDate = offer.CampaignEndDate?.ToString("yyyy-MM-dd"),
                CampaignBonusMultiplier = offer.Type == OfferType.JointOrder ? offer.CampaignBonusMultiplier : null,
                BiddingDeadline = offer.BiddingDeadline?.ToString("yyyy-MM-dd"),
                // Financial fields
                DepotPrice = offer.DepotPrice,
                MalFazlasi = offer.MalFazlasi ?? $"{offer.MinSaleQuantity}+{offer.BonusQuantity}",
                DiscountPercentage = offer.DiscountPercentage,
                NetPrice = offer.NetPrice,
                MaxSaleQuantity = offer.MaxSaleQuantity,
                OfferDescription = offer.Description,
                // Barem and stock tracking
                WarehouseBaremId = offer.WarehouseBaremId,
                MaxPriceLimit = offer.MaxPriceLimit,
                IsPrivate = offer.IsPrivate,
                TargetPharmacyIds = offer.TargetPharmacyIds,
                SoldQuantity = offer.SoldQuantity,
                RemainingStock = offer.Stock - offer.SoldQuantity
            };

            return Ok(response);
        }

        // GET /api/offers/medication/{medicationId} - İlacın tüm tekliflerini getir
        [HttpGet("medication/{medicationId}")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<OfferDto>>> GetOffersByMedicationId(int medicationId)
        {
            var offers = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .Where(o => o.MedicationId == medicationId && o.Status == OfferStatus.Active)
                .OrderBy(o => o.Price) // En ucuzdan pahalıya
                .ToListAsync();

            var dtos = offers.Select(o => new OfferDto
            {
                Id = o.Id,
                MedicationId = o.MedicationId,
                ProductName = o.Medication.Name,
                Barcode = o.Medication.Barcode,
                Type = o.Type.ToString().ToLower(),
                Stock = $"{o.Stock} + {o.BonusQuantity}",
                Price = o.Price,
                Status = o.Status.ToString().ToLower(),
                PharmacyId = o.PharmacyProfile.Id.ToString(),
                PharmacyName = o.PharmacyProfile.PharmacyName,
                PharmacyUsername = o.PharmacyProfile.Username,
                Description = o.Medication.Description,
                Manufacturer = o.Medication.Manufacturer,
                ImageUrl = null,
                ExpirationDate = o.ExpirationDate.HasValue ? o.ExpirationDate.Value.ToString("MM/yyyy") : null,
                CampaignEndDate = o.CampaignEndDate.HasValue ? o.CampaignEndDate.Value.ToString("yyyy-MM-dd") : null,
                CampaignBonusMultiplier = o.Type == OfferType.JointOrder ? o.CampaignBonusMultiplier : null,
                BiddingDeadline = o.BiddingDeadline.HasValue ? o.BiddingDeadline.Value.ToString("yyyy-MM-dd") : null,
                
                // Barem bilgisi
                MalFazlasi = o.MalFazlasi ?? $"{o.MinSaleQuantity}+{o.BonusQuantity}",
                SoldQuantity = o.SoldQuantity,
                RemainingStock = o.Stock - o.SoldQuantity
                
                // TODO: Depo sorumlusu bilgisi - Migration yapıldıktan sonra aktif et
                // DepotClaimerUserId = o.DepotClaimerUserId,
                // DepotClaimedAt = o.DepotClaimedAt
            }).ToList();

            return Ok(dtos);
        }

        // POST /api/offers - Yeni teklif oluştur
        [HttpPost]
        public async Task<ActionResult<OfferDto>> CreateOffer([FromBody] CreateOfferRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            // Parse offer type
            if (!Enum.TryParse<OfferType>(request.Type, true, out var offerType))
                return BadRequest(new { message = "Invalid offer type. Use: stockSale, jointOrder, purchaseRequest" });

            // Validation: If private, must have target pharmacies
            if (request.IsPrivate && string.IsNullOrEmpty(request.TargetPharmacyIds))
                return BadRequest(new { message = "Özel teklifler için hedef eczane seçilmelidir." });

            // Validation: StockSale type price cannot exceed MaxPriceLimit (Barem price)
            if (offerType == OfferType.StockSale && request.MaxPriceLimit > 0 && request.Price > request.MaxPriceLimit)
                return BadRequest(new { message = $"Fiyat, seçilen barem fiyatından ({request.MaxPriceLimit:N2} TL) yüksek olamaz." });

            // Verify medication exists - support MedicationId, Barcode, or ProductName
            Medication? medication = null;

            if (request.MedicationId.HasValue)
            {
                medication = await _context.Medications.FindAsync(request.MedicationId.Value);
            }
            else if (!string.IsNullOrEmpty(request.Barcode))
            {
                medication = await _context.Medications
                    .FirstOrDefaultAsync(m => m.Barcode == request.Barcode);
            }
            else if (!string.IsNullOrEmpty(request.ProductName))
            {
                medication = await _context.Medications
                    .FirstOrDefaultAsync(m => m.Name == request.ProductName);
            }

            if (medication == null)
                return NotFound(new { message = "Medication not found" });

            // 🆕 SMART MATCHING: JointOrder veya PurchaseRequest için mevcut ilan kontrolü
            if (offerType == OfferType.JointOrder || offerType == OfferType.PurchaseRequest)
            {
                Console.WriteLine($"[SMART MATCHING] Checking for existing offers. MedicationId: {medication.Id}, PharmacyId: {pharmacyId.Value}, RequestedStock: {request.Stock}");
                
                // Aynı ilaç için TÜM aktif JointOrder veya PurchaseRequest'leri bul (kendinki dahil)
                var matchingOffers = await _context.Offers
                    .Include(o => o.PharmacyProfile)
                    .Where(o => o.MedicationId == medication.Id 
                             && (o.Type == OfferType.JointOrder || o.Type == OfferType.PurchaseRequest)
                             && o.Status == OfferStatus.Active)
                    .ToListAsync();

                Console.WriteLine($"[SMART MATCHING] Found {matchingOffers.Count} matching offers");

                // Kalan stok yeterli olan ilk teklifi bul
                var suitableOffer = matchingOffers.FirstOrDefault(o => 
                {
                    // Barem varsa: toplam barem stoku - mevcut talepler = kalan
                    if (!string.IsNullOrEmpty(o.MalFazlasi))
                    {
                        var baremParts = o.MalFazlasi.Split('+').Select(s => int.TryParse(s.Trim(), out var v) ? v : 0).ToArray();
                        var totalBaremStock = baremParts.Sum();
                        
                        // Bu teklifin kalan stoğu
                        var remainingStock = totalBaremStock - o.SoldQuantity;
                        Console.WriteLine($"[SMART MATCHING] Offer {o.Id}: Barem={o.MalFazlasi}, TotalBarem={totalBaremStock}, SoldQty={o.SoldQuantity}, Remaining={remainingStock}, Requested={request.Stock}");
                        return remainingStock >= request.Stock;
                    }
                    
                    // Barem yoksa: normal stok kontrolü
                    var stockRemaining = o.Stock - o.SoldQuantity;
                    Console.WriteLine($"[SMART MATCHING] Offer {o.Id}: Stock={o.Stock}, SoldQty={o.SoldQuantity}, Remaining={stockRemaining}, Requested={request.Stock}");
                    return stockRemaining >= request.Stock;
                });

                if (suitableOffer != null)
                {
                    Console.WriteLine($"[SMART MATCHING] Found suitable offer! OfferId: {suitableOffer.Id}, OfferType: {suitableOffer.Type}, NewOfferType: {offerType}");
                    
                    // 🆕 Mantık:
                    // - JointOrder açılıyorsa: Mevcut JointOrder veya PurchaseRequest varsa → engelle
                    // - PurchaseRequest açılıyorsa: Mevcut JointOrder varsa → engelle, mevcut PurchaseRequest varsa → izin ver
                    
                    bool shouldBlock = false;
                    string message = "";
                    
                    if (offerType == OfferType.JointOrder)
                    {
                        // JointOrder açılıyorsa her durumda engelle
                        shouldBlock = true;
                        message = suitableOffer.Type == OfferType.JointOrder
                            ? "Bu ilaç için yeterli stoklu bir ortak sipariş bulundu. Yeni teklif açmak yerine mevcut gruba katılabilirsiniz."
                            : "Bu ilaç için aynı ilacı talep eden bir alım talebi var. Mevcut talebe katılabilirsiniz.";
                    }
                    else if (offerType == OfferType.PurchaseRequest)
                    {
                        // PurchaseRequest açılıyorsa sadece mevcut JointOrder varsa engelle
                        if (suitableOffer.Type == OfferType.JointOrder)
                        {
                            shouldBlock = true;
                            message = "Bu ilaç için yeterli stoklu bir ortak sipariş bulundu. Yeni alım talebi açmak yerine mevcut siparişe katılabilirsiniz.";
                        }
                        else
                        {
                            // Mevcut de PurchaseRequest ise izin ver
                            Console.WriteLine("[SMART MATCHING] Both are PurchaseRequest - allowing save");
                            shouldBlock = false;
                        }
                    }
                    
                    if (shouldBlock)
                    {
                        // Kalan stok hesapla - tüm tekliflerin taleplerini topla
                        int remainingStockValue;
                        if (!string.IsNullOrEmpty(suitableOffer.MalFazlasi))
                        {
                            var baremParts = suitableOffer.MalFazlasi.Split('+').Select(s => int.TryParse(s.Trim(), out var v) ? v : 0).ToArray();
                            var baremTotal = baremParts.Sum();
                            
                            // Tüm tekliflerin talep ettiği toplam stok
                            var totalRequested = matchingOffers.Sum(o => o.Stock);
                            remainingStockValue = Math.Max(0, baremTotal - totalRequested);
                            
                            Console.WriteLine($"[SMART MATCHING] BaremTotal: {baremTotal}, TotalRequested: {totalRequested}, Remaining: {remainingStockValue}");
                        }
                        else
                        {
                            remainingStockValue = suitableOffer.Stock - suitableOffer.SoldQuantity;
                        }
                        
                        return Conflict(new 
                        { 
                            hasSuggestion = true,
                            suggestedOfferId = suitableOffer.Id,
                            suggestedMedicationId = suitableOffer.MedicationId,
                            suggestedOfferType = suitableOffer.Type.ToString().ToLower(),
                            barem = suitableOffer.MalFazlasi,
                            message = message,
                            remainingStock = remainingStockValue,
                            pharmacyName = suitableOffer.PharmacyProfile?.PharmacyName ?? "Bilinmiyor"
                        });
                    }
                }
                else
                {
                    Console.WriteLine("[SMART MATCHING] No suitable offer found - proceeding with creation");
                }
            }

            // For StockSale offers, ensure inventory exists
            if (offerType == OfferType.StockSale)
            {
                var inventory = await _context.InventoryItems
                    .Where(i => i.PharmacyProfileId == pharmacyId.Value && i.MedicationId == medication.Id)
                    .FirstOrDefaultAsync();

                if (inventory == null)
                {
                    // Auto-create inventory item from offer data
                    DateTime expiryDate;
                    
                    // Parse expiration date (expected format: "MM/YYYY" or "MM / YYYY")
                    if (!string.IsNullOrEmpty(request.ExpirationDate))
                    {
                        var parts = request.ExpirationDate.Replace(" ", "").Split('/');
                        if (parts.Length == 2 && int.TryParse(parts[0], out int month) && int.TryParse(parts[1], out int year))
                        {
                            // Set to last day of the month
                            expiryDate = new DateTime(year, month, DateTime.DaysInMonth(year, month));
                        }
                        else
                        {
                            // Default to 1 year from now if parsing fails
                            expiryDate = DateTime.UtcNow.AddYears(1);
                        }
                    }
                    else
                    {
                        expiryDate = DateTime.UtcNow.AddYears(1);
                    }

                    // Create new inventory item
                    inventory = new InventoryItem
                    {
                        PharmacyProfileId = pharmacyId.Value,
                        MedicationId = medication.Id,
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
                    // Update inventory quantity if needed
                    inventory.Quantity = request.Stock;
                    inventory.BonusQuantity = request.BonusQuantity;
                    await _context.SaveChangesAsync();
                }
            }

            // Type-specific validation for JointOrder
            if (offerType == OfferType.JointOrder)
            {
                // 🆕 Joint Order: Stock cannot exceed Barem limit (MinAdet + MalFazlasi)
                if (!string.IsNullOrEmpty(request.MalFazlasi))
                {
                    var mfParts = request.MalFazlasi.Split('+');
                    if (mfParts.Length == 2 && 
                        int.TryParse(mfParts[0], out int minAdet) && 
                        int.TryParse(mfParts[1], out int malFazlasi))
                    {
                        int baremLimit = minAdet + malFazlasi;
                        if (request.Stock > baremLimit)
                        {
                            return BadRequest(new { message = $"Ortak sipariş miktarı, barem limitini ({baremLimit} adet) aşamaz." });
                        }
                    }
                }
            }
            else if (offerType == OfferType.PurchaseRequest)
            {
                // PurchaseRequest may have special validation logic if needed
            }

            // Parse expiration date
            DateTime? expirationDate = null;
            if (!string.IsNullOrEmpty(request.ExpirationDate))
            {
                var parts = request.ExpirationDate.Replace(" ", "").Split('/');
                if (parts.Length == 2 && int.TryParse(parts[0], out int month) && int.TryParse(parts[1], out int year))
                {
                    expirationDate = DateTime.SpecifyKind(new DateTime(year, month, DateTime.DaysInMonth(year, month)), DateTimeKind.Utc);
                }
            }

            // Calculate NetPrice
            decimal netPrice = request.Price; // Default to Price if no calculation possible

            if (!string.IsNullOrEmpty(request.MalFazlasi))
            {
                // Parse MF "X+Y"
                var parts = request.MalFazlasi.Split('+');
                if (parts.Length == 2 && 
                    int.TryParse(parts[0], out int paidQty) && 
                    int.TryParse(parts[1], out int freeQty))
                {
                    // Formula: (DepotPrice * PaidQty) / (PaidQty + FreeQty)
                    // But usually DepotPrice is the base. If user entered DepotPrice, use it.
                    // If not, use Price as base?
                    // Requirement: "Formula if MF (X+Y) exists: NetPrice = (DepotPrice * X) / (X + Y)"
                    
                    decimal basePrice = request.DepotPrice > 0 ? request.DepotPrice : request.Price;
                    
                    if (paidQty + freeQty > 0)
                    {
                        netPrice = (basePrice * paidQty) / (paidQty + freeQty);
                    }
                }
            }
            else if (request.DiscountPercentage > 0)
            {
                // Formula: DepotPrice * (1 - (DiscountPercentage/100))
                decimal basePrice = request.DepotPrice > 0 ? request.DepotPrice : request.Price;
                netPrice = basePrice * (1 - (request.DiscountPercentage / 100));
            }

            var offer = new Offer
            {
                PharmacyProfileId = pharmacyId.Value,
                MedicationId = medication.Id,
                Type = offerType,
                Price = request.Price, // This is the "OfferPrice" (Unit Price)
                Stock = request.Stock,
                BonusQuantity = request.BonusQuantity,
                MinSaleQuantity = request.MinSaleQuantity,
                Status = OfferStatus.Active,
                ExpirationDate = expirationDate,
                
                // New Fields
                DepotPrice = request.DepotPrice,
                MalFazlasi = request.MalFazlasi,
                DiscountPercentage = request.DiscountPercentage,
                NetPrice = netPrice,
                MaxSaleQuantity = request.MaxSaleQuantity,
                Description = request.Description,

                // Private offer fields
                IsPrivate = request.IsPrivate,
                TargetPharmacyIds = request.TargetPharmacyIds,
                WarehouseBaremId = request.WarehouseBaremId,
                MaxPriceLimit = request.MaxPriceLimit,

                // Legacy fields (kept for backwards compatibility)
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

            // Load navigation properties for response
            await _context.Entry(offer).Reference(o => o.Medication).LoadAsync();
            await _context.Entry(offer).Reference(o => o.PharmacyProfile).LoadAsync();

            var response = new OfferDto
            {
                Id = offer.Id,
                MedicationId = offer.MedicationId,
                ProductName = offer.Medication.Name,
                Barcode = offer.Medication.Barcode,
                Type = offer.Type.ToString().ToLower(),
                Stock = offer.Stock.ToString(),
                Price = offer.Price,
                Status = offer.Status.ToString().ToLower(),
                PharmacyId = offer.PharmacyProfile.Id.ToString(),
                PharmacyName = offer.PharmacyProfile.PharmacyName,
                PharmacyUsername = offer.PharmacyProfile.Username,
                Description = offer.Medication.Description,
                Manufacturer = offer.Medication.Manufacturer,
                ImageUrl = null,
                ExpirationDate = offer.ExpirationDate?.ToString("MM/yyyy"),
                CampaignEndDate = offer.CampaignEndDate?.ToString("yyyy-MM-dd"),
                BiddingDeadline = offer.BiddingDeadline?.ToString("yyyy-MM-dd"),
                
                // New fields
                DepotPrice = offer.DepotPrice,
                NetPrice = offer.NetPrice,
                IsPrivate = offer.IsPrivate,
                TargetPharmacyIds = offer.TargetPharmacyIds,
                WarehouseBaremId = offer.WarehouseBaremId,
                MaxPriceLimit = offer.MaxPriceLimit
            };

            // 🆕 SignalR ile tüm bağlı clientlara offer değişikliğini bildir
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", new
            {
                message = $"Yeni teklif oluşturuldu: {offer.Medication.Name}",
                type = "entityUpdated",
                timestamp = DateTime.UtcNow,
                senderId = (string?)null
            });

            return CreatedAtAction(nameof(GetAllOffers), new { id = offer.Id }, response);
        }

        // PATCH /api/offers/{id}/status - Teklif durumunu güncelle
        [HttpPatch("{id}/status")]
        public async Task<ActionResult> UpdateOfferStatus(int id, [FromBody] UpdateOfferStatusRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var offer = await _context.Offers
                .FirstOrDefaultAsync(o => o.Id == id && o.PharmacyProfileId == pharmacyId.Value);

            if (offer == null)
                return NotFound(new { message = "Offer not found" });

            if (Enum.TryParse<OfferStatus>(request.Status, true, out var newStatus))
            {
                offer.Status = newStatus;
                offer.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(new { message = "Offer status updated successfully" });
            }

            return BadRequest(new { message = "Invalid status value" });
        }

        // PUT /api/offers/{id} - Teklif düzenle
        [HttpPut("{id}")]
        public async Task<ActionResult<OfferDto>> UpdateOffer(int id, [FromBody] UpdateOfferRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var offer = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .FirstOrDefaultAsync(o => o.Id == id && o.PharmacyProfileId == pharmacyId.Value);

            if (offer == null)
                return NotFound(new { message = "Offer not found" });

            // Update common fields
            offer.Price = request.Price;
            offer.Stock = request.Stock;
            offer.BonusQuantity = request.BonusQuantity;
            offer.MinSaleQuantity = request.MinSaleQuantity;

            // Update new fields
            offer.DepotPrice = request.DepotPrice.GetValueOrDefault();
            offer.MalFazlasi = request.MalFazlasi;
            offer.DiscountPercentage = request.DiscountPercentage.GetValueOrDefault();
            offer.MaxSaleQuantity = request.MaxSaleQuantity;
            offer.Description = request.Description;

            // Recalculate NetPrice
            decimal netPrice = request.Price;
            if (!string.IsNullOrEmpty(request.MalFazlasi))
            {
                var parts = request.MalFazlasi.Split('+');
                if (parts.Length == 2 && 
                    int.TryParse(parts[0], out int paidQty) && 
                    int.TryParse(parts[1], out int freeQty))
                {
                    decimal basePrice = request.DepotPrice.GetValueOrDefault() > 0 ? request.DepotPrice.GetValueOrDefault() : request.Price;
                    if (paidQty + freeQty > 0)
                        netPrice = (basePrice * paidQty) / (paidQty + freeQty);
                }
            }
            else if (request.DiscountPercentage.GetValueOrDefault() > 0)
            {
                decimal basePrice = request.DepotPrice.GetValueOrDefault() > 0 ? request.DepotPrice.GetValueOrDefault() : request.Price;
                netPrice = basePrice * (1 - (request.DiscountPercentage.GetValueOrDefault() / 100));
            }
            offer.NetPrice = netPrice;

            // Update type-specific fields based on offer type
            if (offer.Type == OfferType.JointOrder)
            {
                if (request.CampaignEndDate.HasValue)
                    offer.CampaignEndDate = request.CampaignEndDate;
                if (request.CampaignStartDate.HasValue)
                    offer.CampaignStartDate = request.CampaignStartDate;
                if (request.CampaignBonusMultiplier.HasValue)
                    offer.CampaignBonusMultiplier = request.CampaignBonusMultiplier.Value;
            }
            else if (offer.Type == OfferType.PurchaseRequest)
            {
                if (request.MinimumOrderQuantity.HasValue)
                    offer.MinimumOrderQuantity = request.MinimumOrderQuantity;
                if (request.BiddingDeadline.HasValue)
                    offer.BiddingDeadline = request.BiddingDeadline;
                if (request.AcceptingCounterOffers.HasValue)
                    offer.AcceptingCounterOffers = request.AcceptingCounterOffers.Value;
            }

            // Update barem fields
            if (request.WarehouseBaremId.HasValue)
                offer.WarehouseBaremId = request.WarehouseBaremId;
            if (request.MaxPriceLimit.HasValue)
                offer.MaxPriceLimit = request.MaxPriceLimit.Value;

            offer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var response = new OfferDto
            {
                Id = offer.Id,
                MedicationId = offer.MedicationId,
                ProductName = offer.Medication.Name,
                Type = offer.Type.ToString().ToLower(),
                Stock = $"{offer.Stock} + {offer.BonusQuantity}",
                Price = offer.Price,
                Status = offer.Status.ToString().ToLower(),
                PharmacyId = offer.PharmacyProfile.Id.ToString(),
                PharmacyName = offer.PharmacyProfile.PharmacyName,
                PharmacyUsername = offer.PharmacyProfile.Username,
                Description = offer.Medication.Description,
                Manufacturer = offer.Medication.Manufacturer,
                ImageUrl = null,
                CampaignEndDate = offer.CampaignEndDate?.ToString("yyyy-MM-dd"),
                CampaignBonusMultiplier = offer.Type == OfferType.JointOrder ? offer.CampaignBonusMultiplier : null,
                BiddingDeadline = offer.BiddingDeadline?.ToString("yyyy-MM-dd")
            };

            return Ok(response);
        }

        // DELETE /api/offers/{id} - Teklifi sil
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteOffer(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var offer = await _context.Offers
                .FirstOrDefaultAsync(o => o.Id == id && o.PharmacyProfileId == pharmacyId.Value);

            if (offer == null)
                return NotFound(new { message = "Offer not found" });

            _context.Offers.Remove(offer);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Offer deleted successfully" });
        }

        // 🆕 POST /api/offers/{id}/claim-depot - Depo sorumluluğunu üstlen
        [HttpPost("{id}/claim-depot")]
        public async Task<ActionResult> ClaimDepot(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (!pharmacyId.HasValue)
                return Unauthorized(new { message = "Pharmacy ID not found in token" });

            var offer = await _context.Offers
                .Include(o => o.Medication)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (offer == null)
                return NotFound(new { message = "Offer not found" });

            // Zaten birisi claim etmiş mi?
            if (offer.DepotClaimerUserId.HasValue)
            {
                return Conflict(new { 
                    message = "Bu teklif için zaten depo sorumlusu belirlenmiş.",
                    claimerUserId = offer.DepotClaimerUserId 
                });
            }

            // Claim et
            offer.DepotClaimerUserId = pharmacyId.Value;
            offer.DepotClaimedAt = DateTime.UtcNow;
            offer.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // SignalR ile bildir
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", new
            {
                message = $"Depo sorumlusu belirlendi: {offer.Medication.Name}",
                type = "entityUpdated",
                timestamp = DateTime.UtcNow,
                senderId = (string?)null
            });

            return Ok(new { 
                message = "Depo sorumluluğu başarıyla üstlenildi.",
                claimerUserId = pharmacyId.Value,
                claimedAt = offer.DepotClaimedAt
            });
        }

        // 🆕 DELETE /api/offers/{id}/claim-depot - Depo sorumluluğundan çık
        [HttpDelete("{id}/claim-depot")]
        public async Task<ActionResult> UnclaimDepot(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (!pharmacyId.HasValue)
                return Unauthorized(new { message = "Pharmacy ID not found in token" });

            var offer = await _context.Offers
                .Include(o => o.Medication)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (offer == null)
                return NotFound(new { message = "Offer not found" });

            // Sadece claim eden kişi unclaim edebilir
            if (offer.DepotClaimerUserId != pharmacyId.Value)
            {
                return Forbid();
            }

            // Unclaim
            offer.DepotClaimerUserId = null;
            offer.DepotClaimedAt = null;
            offer.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // SignalR ile bildir
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", new
            {
                message = $"Depo sorumlusu ayrıldı: {offer.Medication.Name}",
                type = "entityUpdated",
                timestamp = DateTime.UtcNow,
                senderId = (string?)null
            });

            return Ok(new { message = "Depo sorumluluğundan ayrıldınız." });
        }

        private long? GetPharmacyIdFromToken()
        {
            var pharmacyIdClaim = User.FindFirst("PharmacyId")?.Value;
            Console.WriteLine($"[DEBUG] PharmacyId Claim Value: '{pharmacyIdClaim}'");
            
            if (long.TryParse(pharmacyIdClaim, out var pharmacyId))
            {
                Console.WriteLine($"[DEBUG] Parsed PharmacyId: {pharmacyId}");
                return pharmacyId;
            }
            
            Console.WriteLine($"[DEBUG] Failed to parse PharmacyId from claim: '{pharmacyIdClaim}'");
            return null;
        }
    }
}
