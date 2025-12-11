using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IdentityDbContext _identityContext;
        private readonly ILogger<OrdersController> _logger;

        public OrdersController(AppDbContext context, IdentityDbContext identityContext, ILogger<OrdersController> logger)
        {
            _context = context;
            _identityContext = identityContext;
            _logger = logger;
        }

        /// <summary>
        /// Kullanıcının siparişlerini getirir
        /// type=buyer -> Alıcı olarak siparişler
        /// type=seller -> Satıcı olarak siparişler
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetOrders([FromQuery] string? type, [FromQuery] int? groupId)
        {
            var pharmacyId = await GetPharmacyIdFromToken();
            if (pharmacyId == null)
            {
                return Unauthorized(new { message = "Eczane profili bulunamadı" });
            }

            IQueryable<Order> query = _context.Orders
                .Include(o => o.BuyerPharmacy)
                .Include(o => o.SellerPharmacy)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Medication);

            // Type filter
            if (type?.ToLower() == "buyer")
            {
                query = query.Where(o => o.BuyerPharmacyId == pharmacyId);
            }
            else if (type?.ToLower() == "seller")
            {
                query = query.Where(o => o.SellerPharmacyId == pharmacyId);
            }
            else
            {
                // All orders where user is buyer or seller
                query = query.Where(o => o.BuyerPharmacyId == pharmacyId || o.SellerPharmacyId == pharmacyId);
            }

            // Note: Group filter not supported - Order entity has no GroupId field

            var orders = await query
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => new OrderDto
                {
                    Id = o.Id,
                    OrderNumber = o.OrderNumber,
                    BuyerPharmacyId = o.BuyerPharmacyId,
                    BuyerPharmacyName = o.BuyerPharmacy.PharmacyName,
                    SellerPharmacyId = o.SellerPharmacyId,
                    SellerPharmacyName = o.SellerPharmacy.PharmacyName,
                    Status = o.Status.ToString(),
                    PaymentStatus = o.PaymentStatus.ToString(),
                    TotalAmount = o.TotalAmount,
                    CreatedAt = o.CreatedAt.ToString("dd.MM.yyyy HH:mm"),
                    OrderDate = o.OrderDate.ToString("dd.MM.yyyy HH:mm"),
                    Items = o.OrderItems.Select(oi => new OrderItemDto
                    {
                        Id = oi.Id,
                        MedicationId = oi.MedicationId,
                        MedicationName = oi.Medication.Name,
                        Quantity = oi.Quantity,
                        UnitPrice = oi.UnitPrice,
                        TotalPrice = oi.Quantity * oi.UnitPrice,
                        BonusQuantity = oi.BonusQuantity,
                        ProfitAmount = oi.ProfitAmount // 🆕
                    }).ToList()
                })
                .ToListAsync();

            return Ok(orders);
        }

        /// <summary>
        /// Sepetteki ürünlerden sipariş oluştur
        /// POST /api/orders
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateOrder()
        {
            var pharmacyId = await GetPharmacyIdFromToken();
            if (pharmacyId == null)
            {
                return Unauthorized(new { message = "Eczane profili bulunamadı" });
            }

            // Sepeti al
            var cart = await _context.Carts
                .Include(c => c.CartItems)
                    .ThenInclude(ci => ci.Offer)
                        .ThenInclude(o => o.Medication)
                .Include(c => c.CartItems)
                    .ThenInclude(ci => ci.Offer)
                        .ThenInclude(o => o.PharmacyProfile)
                .FirstOrDefaultAsync(c => c.PharmacyProfileId == pharmacyId.Value);

            if (cart == null || !cart.CartItems.Any())
            {
                return BadRequest(new { message = "Sepetiniz boş" });
            }

            // Kendi teklifine sipariş kontrolü
            var selfOffers = cart.CartItems
                .Where(ci => ci.Offer.PharmacyProfileId == pharmacyId.Value)
                .ToList();

            if (selfOffers.Any())
            {
                var firstSelfOffer = selfOffers.First();
                return BadRequest(new 
                { 
                    selfOrderError = true,
                    message = "Kendi teklifinize sipariş veremezsiniz.",
                    editLink = $"/ilaclar/teklif-duzenle/{firstSelfOffer.OfferId}"
                });
            }

            // Toplam tutarı hesapla
            decimal totalAmount = cart.CartItems.Sum(ci => ci.Quantity * ci.Offer.Price);

            // Bakiye kontrolü
            var buyerProfile = await _context.PharmacyProfiles.FindAsync(pharmacyId.Value);
            if (buyerProfile == null)
            {
                return BadRequest(new { message = "Eczane profili bulunamadı" });
            }

            if (buyerProfile.Balance < totalAmount)
            {
                return BadRequest(new 
                { 
                    insufficientBalance = true,
                    message = "Yetersiz bakiye",
                    currentBalance = buyerProfile.Balance,
                    requiredAmount = totalAmount
                });
            }

            // Her satıcı için ayrı sipariş oluştur
            var ordersBySeller = cart.CartItems
                .GroupBy(ci => ci.Offer.PharmacyProfileId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var createdOrders = new List<Order>();
            var now = DateTime.UtcNow;

            foreach (var sellerGroup in ordersBySeller)
            {
                var sellerId = sellerGroup.Key;
                var items = sellerGroup.Value;

                // Format: ORD-YYMMDD-XXXX (max 20 chars) - fits 50 char limit
                var orderNumber = $"ORD-{now:yyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper()}";
                var orderTotal = items.Sum(ci => ci.Quantity * ci.Offer.Price);

                var order = new Order
                {
                    OrderNumber = orderNumber,
                    BuyerPharmacyId = pharmacyId.Value,
                    SellerPharmacyId = sellerId,
                    Status = OrderStatus.Pending,
                    TotalAmount = orderTotal,
                    OrderDate = now,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync(); // Order ID'yi almak için

                // Order items oluştur
                foreach (var cartItem in items)
                {
                    // Kar hesapla: (bonus / toplam birim) * birim fiyat * miktar
                    decimal profitAmount = 0;
                    if (cartItem.Offer.BonusQuantity > 0)
                    {
                        var totalUnits = cartItem.Offer.Stock + cartItem.Offer.BonusQuantity;
                        if (totalUnits > 0)
                        {
                            var bonusRatio = (decimal)cartItem.Offer.BonusQuantity / totalUnits;
                            profitAmount = bonusRatio * cartItem.Offer.Price * cartItem.Quantity;
                        }
                    }

                    var orderItem = new OrderItem
                    {
                        OrderId = order.Id,
                        MedicationId = cartItem.Offer.MedicationId,
                        OfferId = cartItem.OfferId, // 🆕 Teklif ID'si eklendi
                        Quantity = cartItem.Quantity,
                        UnitPrice = cartItem.Offer.Price,
                        BonusQuantity = cartItem.Offer.BonusQuantity,
                        ProfitAmount = profitAmount // 🆕 Kar miktarı
                    };
                    _context.OrderItems.Add(orderItem);

                    // Satılan miktarı güncelle
                    cartItem.Offer.SoldQuantity += cartItem.Quantity;
                    
                    // Stok tükendiyse durumu güncelle
                    if (cartItem.Offer.Stock - cartItem.Offer.SoldQuantity <= 0)
                    {
                        cartItem.Offer.Status = OfferStatus.OutOfStock;
                    }
                }

                createdOrders.Add(order);

                // Her satıcı için ayrı transaction oluştur (alıcı tarafında)
                var buyerTransaction = new Transaction
                {
                    PharmacyProfileId = pharmacyId.Value,
                    Type = TransactionType.Purchase,
                    Amount = -orderTotal,
                    Description = $"Sipariş: {order.OrderNumber}",
                    Date = now,
                    CounterpartyPharmacyId = sellerId,
                    RelatedReferenceId = order.OrderNumber
                };
                _context.Transactions.Add(buyerTransaction);

                // Satıcı tarafında da transaction oluştur
                var sellerTransaction = new Transaction
                {
                    PharmacyProfileId = sellerId,
                    Type = TransactionType.Sale,
                    Amount = orderTotal,
                    Description = $"Satış: {order.OrderNumber}",
                    Date = now,
                    CounterpartyPharmacyId = pharmacyId.Value,
                    RelatedReferenceId = order.OrderNumber
                };
                _context.Transactions.Add(sellerTransaction);

                // Satıcının bakiyesine ekle
                var sellerProfile = await _context.PharmacyProfiles.FindAsync(sellerId);
                if (sellerProfile != null)
                {
                    sellerProfile.Balance += orderTotal;
                }
            }

            // Bakiye güncelle - alıcıdan düş
            buyerProfile.Balance -= totalAmount;

            // Sepeti temizle
            _context.CartItems.RemoveRange(cart.CartItems);

            // Stok kilitlerini temizle
            var stockLocks = await _context.StockLocks
                .Where(sl => sl.PharmacyProfileId == pharmacyId.Value)
                .ToListAsync();
            if (stockLocks.Any())
            {
                _context.StockLocks.RemoveRange(stockLocks);
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation($"[ORDER] Sipariş oluşturuldu. Alıcı: {pharmacyId.Value}, Toplam: {totalAmount:N2} TL, Sipariş Sayısı: {createdOrders.Count}");

            return Ok(new 
            { 
                message = $"{createdOrders.Count} adet sipariş oluşturuldu",
                orderIds = createdOrders.Select(o => o.Id).ToList(),
                totalPaid = totalAmount,
                newBalance = buyerProfile.Balance
            });
        }

        /// <summary>
        /// Belirli bir siparişin detaylarını getir
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrderById(int id)
        {
            var pharmacyId = await GetPharmacyIdFromToken();
            if (pharmacyId == null)
            {
                return Unauthorized(new { message = "Eczane profili bulunamadı" });
            }

            var order = await _context.Orders
                .Include(o => o.BuyerPharmacy)
                .Include(o => o.SellerPharmacy)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Medication)
                .Where(o => o.Id == id && (o.BuyerPharmacyId == pharmacyId || o.SellerPharmacyId == pharmacyId))
                .Select(o => new OrderDto
                {
                    Id = o.Id,
                    OrderNumber = o.OrderNumber,
                    BuyerPharmacyId = o.BuyerPharmacyId,
                    BuyerPharmacyName = o.BuyerPharmacy.PharmacyName,
                    SellerPharmacyId = o.SellerPharmacyId,
                    SellerPharmacyName = o.SellerPharmacy.PharmacyName,
                    Status = o.Status.ToString(),
                    PaymentStatus = o.PaymentStatus.ToString(),
                    TotalAmount = o.TotalAmount,
                    CreatedAt = o.CreatedAt.ToString("dd.MM.yyyy HH:mm"),
                    OrderDate = o.OrderDate.ToString("dd.MM.yyyy HH:mm"),
                    Items = o.OrderItems.Select(oi => new OrderItemDto
                    {
                        Id = oi.Id,
                        MedicationId = oi.MedicationId,
                        MedicationName = oi.Medication.Name,
                        Quantity = oi.Quantity,
                        UnitPrice = oi.UnitPrice,
                        TotalPrice = oi.Quantity * oi.UnitPrice,
                        BonusQuantity = oi.BonusQuantity,
                        ProfitAmount = oi.ProfitAmount // 🆕
                    }).ToList(),
                    
                    // 🆕 Fatura için eczane detayları
                    // Alıcı
                    BuyerTaxNumber = o.BuyerPharmacy.TaxNumber,
                    BuyerTaxOffice = o.BuyerPharmacy.TaxOffice,
                    BuyerAddress = o.BuyerPharmacy.Address,
                    BuyerCity = o.BuyerPharmacy.City,
                    BuyerDistrict = o.BuyerPharmacy.District,
                    BuyerPhone = o.BuyerPharmacy.PhoneNumber,
                    BuyerGLN = o.BuyerPharmacy.GLN,
                    
                    // Satıcı
                    SellerTaxNumber = o.SellerPharmacy.TaxNumber,
                    SellerTaxOffice = o.SellerPharmacy.TaxOffice,
                    SellerAddress = o.SellerPharmacy.Address,
                    SellerCity = o.SellerPharmacy.City,
                    SellerDistrict = o.SellerPharmacy.District,
                    SellerPhone = o.SellerPharmacy.PhoneNumber,
                    SellerGLN = o.SellerPharmacy.GLN
                })
                .FirstOrDefaultAsync();

            if (order == null)
            {
                return NotFound(new { message = "Sipariş bulunamadı" });
            }

            return Ok(order);
        }

        private async Task<long?> GetPharmacyIdFromToken()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return null;

            var pharmacyId = await _identityContext.IdentityUsers
                .Where(u => u.Id == userId)
                .Select(u => u.PharmacyId)
                .FirstOrDefaultAsync();

            return pharmacyId;
        }
    }

    public class OrderDto
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public long BuyerPharmacyId { get; set; }
        public string BuyerPharmacyName { get; set; } = string.Empty;
        public long SellerPharmacyId { get; set; }
        public string SellerPharmacyName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public string CreatedAt { get; set; } = string.Empty;
        public string OrderDate { get; set; } = string.Empty;
        public List<OrderItemDto> Items { get; set; } = new();
        
        // 🆕 Fatura için eczane detayları
        // Alıcı Bilgileri
        public string? BuyerTaxNumber { get; set; }
        public string? BuyerTaxOffice { get; set; }
        public string? BuyerAddress { get; set; }
        public string? BuyerCity { get; set; }
        public string? BuyerDistrict { get; set; }
        public string? BuyerPhone { get; set; }
        public string? BuyerGLN { get; set; }
        
        // Satıcı Bilgileri
        public string? SellerTaxNumber { get; set; }
        public string? SellerTaxOffice { get; set; }
        public string? SellerAddress { get; set; }
        public string? SellerCity { get; set; }
        public string? SellerDistrict { get; set; }
        public string? SellerPhone { get; set; }
        public string? SellerGLN { get; set; }
    }

    public class OrderItemDto
    {
        public int Id { get; set; }
        public int MedicationId { get; set; }
        public string MedicationName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
        public int BonusQuantity { get; set; } // MF
        public decimal ProfitAmount { get; set; } // 🆕 Kar miktarı
    }
}

