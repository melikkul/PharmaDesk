using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PharmaDesk.API.Hubs;

namespace Backend.Services
{
    /// <summary>
    /// Order business logic implementation
    /// Handles: Stock deduction, Balance check, Transaction creation
    /// </summary>
    public class OrderService : IOrderService
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;

        public OrderService(AppDbContext context, IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        // ═══════════════════════════════════════════════════════════════
        // Query Operations
        // ═══════════════════════════════════════════════════════════════

        public async Task<OrderDto?> GetOrderByIdAsync(int orderId, long requestingPharmacyId)
        {
            var order = await _context.Orders
                .Include(o => o.BuyerPharmacy)
                .Include(o => o.SellerPharmacy)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Medication)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null) return null;

            // Authorization check: only buyer or seller can view
            if (order.BuyerPharmacyId != requestingPharmacyId && 
                order.SellerPharmacyId != requestingPharmacyId)
            {
                return null;
            }

            return MapToOrderDto(order);
        }

        public async Task<IEnumerable<OrderDto>> GetOrdersByPharmacyAsync(long pharmacyId, string? role = null)
        {
            var query = _context.Orders
                .Include(o => o.BuyerPharmacy)
                .Include(o => o.SellerPharmacy)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Medication)
                .AsQueryable();

            // Filter by role (buyer or seller)
            if (role?.ToLower() == "buyer")
            {
                query = query.Where(o => o.BuyerPharmacyId == pharmacyId);
            }
            else if (role?.ToLower() == "seller")
            {
                query = query.Where(o => o.SellerPharmacyId == pharmacyId);
            }
            else
            {
                // Both buyer and seller orders
                query = query.Where(o => o.BuyerPharmacyId == pharmacyId || o.SellerPharmacyId == pharmacyId);
            }

            var orders = await query
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return orders.Select(MapToOrderDto);
        }

        public async Task<IEnumerable<OrderDto>> GetAllOrdersAsync(int page, int pageSize, string? status = null)
        {
            var query = _context.Orders
                .Include(o => o.BuyerPharmacy)
                .Include(o => o.SellerPharmacy)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Medication)
                .AsQueryable();

            // Filter by status
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<OrderStatus>(status, true, out var orderStatus))
            {
                query = query.Where(o => o.Status == orderStatus);
            }

            var orders = await query
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return orders.Select(MapToOrderDto);
        }

        // ═══════════════════════════════════════════════════════════════
        // Command Operations
        // ═══════════════════════════════════════════════════════════════

        public async Task<OrderResult> CreateOrderFromCartAsync(long buyerPharmacyId)
        {
            // 1. Get cart with items
            var cart = await _context.Carts
                .Include(c => c.CartItems)
                    .ThenInclude(ci => ci.Offer)
                        .ThenInclude(o => o.Medication)
                .Include(c => c.CartItems)
                    .ThenInclude(ci => ci.Offer)
                        .ThenInclude(o => o.PharmacyProfile)
                .FirstOrDefaultAsync(c => c.PharmacyProfileId == buyerPharmacyId);

            if (cart == null || !cart.CartItems.Any())
                return OrderResult.Error("Sepet boş.");

            // 2. Get buyer pharmacy with balance
            var buyerPharmacy = await _context.PharmacyProfiles
                .FirstOrDefaultAsync(p => p.Id == buyerPharmacyId);

            if (buyerPharmacy == null)
                return OrderResult.Error("Eczane profili bulunamadı.", 404);

            // 3. Calculate total amount
            decimal totalAmount = cart.CartItems.Sum(ci => ci.Quantity * ci.Offer.Price);

            // 4. Balance check
            if (buyerPharmacy.Balance < totalAmount)
                return OrderResult.Error($"Yetersiz bakiye. Gerekli: {totalAmount:N2} TL, Mevcut: {buyerPharmacy.Balance:N2} TL");

            // 5. Group cart items by seller
            var itemsBySeller = cart.CartItems
                .GroupBy(ci => ci.Offer.PharmacyProfileId)
                .ToList();

            var createdOrders = new List<OrderDto>();

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var sellerGroup in itemsBySeller)
                {
                    var sellerId = sellerGroup.Key;
                    var sellerName = sellerGroup.First().Offer.PharmacyProfile?.PharmacyName;

                    // Generate order number
                    var orderNumber = GenerateOrderNumber();

                    // Calculate order total
                    decimal orderTotal = sellerGroup.Sum(ci => ci.Quantity * ci.Offer.Price);

                    // 🆕 Check for depot fulfillment items (role swap scenario)
                    // If any item has IsDepotFulfillment = true, we need to swap roles
                    var hasDepotFulfillment = sellerGroup.Any(ci => 
                        ci.IsDepotFulfillment && ci.Offer.Type == OfferType.PurchaseRequest);

                    // Determine actual buyer and seller based on depot fulfillment
                    long actualBuyerId;
                    long actualSellerId;

                    if (hasDepotFulfillment)
                    {
                        // ROLE SWAP: Checkout user (buyerPharmacyId) becomes SELLER (depot claimer)
                        // Original offer owner (sellerId) becomes BUYER
                        actualBuyerId = sellerId;          // Original offer owner → Buyer
                        actualSellerId = buyerPharmacyId;  // Checkout user → Seller
                    }
                    else
                    {
                        // Normal flow: checkout user is buyer, offer owner is seller
                        actualBuyerId = buyerPharmacyId;
                        actualSellerId = sellerId;
                    }

                    // Create order with correct roles
                    var order = new Order
                    {
                        OrderNumber = orderNumber,
                        BuyerPharmacyId = actualBuyerId,
                        SellerPharmacyId = actualSellerId,
                        TotalAmount = orderTotal,
                        Status = OrderStatus.Pending,
                        PaymentStatus = PaymentStatus.Pending,
                        OrderDate = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.Orders.Add(order);
                    await _context.SaveChangesAsync();

                    // Create order items and update offer stock
                    foreach (var cartItem in sellerGroup)
                    {
                        // 🆕 Handle depot fulfillment: Convert PurchaseRequest to JointOrder
                        if (cartItem.IsDepotFulfillment && cartItem.Offer.Type == OfferType.PurchaseRequest)
                        {
                            // Store original owner before swap
                            var originalOwnerId = cartItem.Offer.PharmacyProfileId;
                            var originalOwnerStock = cartItem.Offer.Stock;
                            
                            cartItem.Offer.Type = OfferType.JointOrder;
                            cartItem.Offer.DepotClaimerUserId = buyerPharmacyId;
                            cartItem.Offer.DepotClaimedAt = DateTime.UtcNow;
                            // 🆕 Transfer ownership: Depot claimer becomes the new owner/organizer
                            cartItem.Offer.PharmacyProfileId = buyerPharmacyId;
                            
                            // 🆕 Add original requester to OfferTargets (if not exists)
                            var existingOriginalTarget = await _context.OfferTargets
                                .FirstOrDefaultAsync(ot => ot.OfferId == cartItem.OfferId && ot.TargetPharmacyId == originalOwnerId);
                            
                            if (existingOriginalTarget == null)
                            {
                                _context.OfferTargets.Add(new OfferTarget
                                {
                                    OfferId = cartItem.OfferId,
                                    TargetPharmacyId = originalOwnerId,
                                    RequestedQuantity = originalOwnerStock, // Original requester's quantity
                                    IsSupplier = false,
                                    AddedAt = cartItem.Offer.CreatedAt
                                });
                            }
                            
                            // 🆕 Add depot claimer (current user) to OfferTargets as supplier
                            var existingClaimerTarget = await _context.OfferTargets
                                .FirstOrDefaultAsync(ot => ot.OfferId == cartItem.OfferId && ot.TargetPharmacyId == buyerPharmacyId);
                            
                            if (existingClaimerTarget == null)
                            {
                                _context.OfferTargets.Add(new OfferTarget
                                {
                                    OfferId = cartItem.OfferId,
                                    TargetPharmacyId = buyerPharmacyId,
                                    RequestedQuantity = cartItem.Quantity, // Depot claimer's contribution
                                    IsSupplier = true,
                                    AddedAt = DateTime.UtcNow
                                });
                            }
                            else
                            {
                                existingClaimerTarget.RequestedQuantity += cartItem.Quantity;
                                existingClaimerTarget.IsSupplier = true;
                            }
                        }

                        var orderItem = new OrderItem
                        {
                            OrderId = order.Id,
                            MedicationId = cartItem.Offer.MedicationId,
                            OfferId = cartItem.OfferId,
                            Quantity = cartItem.Quantity,
                            UnitPrice = cartItem.Offer.Price
                        };

                        _context.OrderItems.Add(orderItem);

                        // Update offer sold quantity
                        cartItem.Offer.SoldQuantity += cartItem.Quantity;
                        cartItem.Offer.UpdatedAt = DateTime.UtcNow;

                        // Check if offer should be marked as sold
                        if (cartItem.Offer.SoldQuantity >= cartItem.Offer.Stock)
                        {
                            cartItem.Offer.Status = OfferStatus.Sold;
                        }
                    }

                    // 🆕 PROVISION PATTERN: Balance transfers with correct roles
                    // Only deduct from buyer, DO NOT credit seller yet (money stays in pool)
                    var actualBuyerPharmacy = await _context.PharmacyProfiles.FindAsync(actualBuyerId);

                    // Deduct balance from actual buyer ONLY
                    if (actualBuyerPharmacy != null)
                    {
                        actualBuyerPharmacy.Balance -= orderTotal;
                    }

                    // 🚫 REMOVED: Seller balance update moved to ProcessBalance (Capture stage)
                    // Para havuzda (Transaction tablosunda Provision statüsüyle) bekleyecek

                    // Get names for transaction descriptions
                    var buyerName = actualBuyerPharmacy?.PharmacyName ?? "Bilinmeyen";
                    var actualSellerPharmacy = await _context.PharmacyProfiles.FindAsync(actualSellerId);
                    var actualSellerName = actualSellerPharmacy?.PharmacyName ?? "Bilinmeyen";

                    // 🆕 Create PROVISION transaction for buyer (money blocked, waiting in pool)
                    _context.Transactions.Add(new Transaction
                    {
                        PharmacyProfileId = actualBuyerId,
                        CounterpartyPharmacyId = actualSellerId,
                        OrderId = order.Id,
                        OfferId = sellerGroup.First().OfferId, // Link to offer for ProcessBalance
                        Type = TransactionType.Purchase,
                        Amount = -orderTotal,
                        Description = $"Provizyon: {orderNumber} - {actualSellerName}" + (hasDepotFulfillment ? " (Ortak Sipariş)" : ""),
                        Date = DateTime.UtcNow,
                        Status = TransactionStatus.Provision // 🆕 Para bloke, havuzda bekliyor
                    });

                    // 🚫 REMOVED: Seller transaction creation moved to ProcessBalance (Capture stage)
                    // Satıcı transaction'ı Capture aşamasında oluşturulacak

                    await _context.SaveChangesAsync();

                    // Load order with includes for DTO mapping
                    var createdOrder = await _context.Orders
                        .Include(o => o.BuyerPharmacy)
                        .Include(o => o.SellerPharmacy)
                        .Include(o => o.OrderItems)
                            .ThenInclude(oi => oi.Medication)
                        .FirstAsync(o => o.Id == order.Id);

                    createdOrders.Add(MapToOrderDto(createdOrder));
                }

                // Clear cart
                _context.CartItems.RemoveRange(cart.CartItems);
                cart.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Send SignalR notifications
                await SendOrderNotificationAsync(buyerPharmacyId, $"Siparişleriniz oluşturuldu. Toplam: {totalAmount:N2} TL");

                return OrderResult.OkMultiple(createdOrders, totalAmount);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return OrderResult.Error($"Sipariş oluşturulurken hata: {ex.Message}");
            }
        }

        public async Task<OrderResult> CreateOrderAsync(CreateOrderRequest request, long buyerPharmacyId)
        {
            // 1. Get offer with medication
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .FirstOrDefaultAsync(o => o.Id == request.OfferId);

            if (offer == null)
                return OrderResult.Error("Teklif bulunamadı.", 404);

            if (offer.Status != OfferStatus.Active)
                return OrderResult.Error("Teklif aktif değil.");

            // 2. Stock check
            int availableStock = offer.Stock - offer.SoldQuantity;
            if (request.Quantity > availableStock)
                return OrderResult.Error($"Yetersiz stok. Mevcut: {availableStock}");

            // 3. Get buyer pharmacy
            var buyerPharmacy = await _context.PharmacyProfiles.FindAsync(buyerPharmacyId);
            if (buyerPharmacy == null)
                return OrderResult.Error("Eczane profili bulunamadı.", 404);

            // 4. Calculate amount and check balance
            decimal totalAmount = request.Quantity * offer.Price;
            if (buyerPharmacy.Balance < totalAmount)
                return OrderResult.Error($"Yetersiz bakiye. Gerekli: {totalAmount:N2} TL");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Generate order number
                var orderNumber = GenerateOrderNumber();

                // Create order
                var order = new Order
                {
                    OrderNumber = orderNumber,
                    BuyerPharmacyId = buyerPharmacyId,
                    SellerPharmacyId = offer.PharmacyProfileId,
                    TotalAmount = totalAmount,
                    Status = OrderStatus.Pending,
                    PaymentStatus = PaymentStatus.Pending,
                    OrderDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                // Create order item
                var orderItem = new OrderItem
                {
                    OrderId = order.Id,
                    MedicationId = offer.MedicationId,
                    OfferId = offer.Id,
                    Quantity = request.Quantity,
                    UnitPrice = offer.Price
                };

                _context.OrderItems.Add(orderItem);

                // Update offer
                offer.SoldQuantity += request.Quantity;
                offer.UpdatedAt = DateTime.UtcNow;
                if (offer.SoldQuantity >= offer.Stock)
                {
                    offer.Status = OfferStatus.Sold;
                }

                // 🆕 PROVISION PATTERN: Update balances
                // Only deduct from buyer, DO NOT credit seller (money stays in pool)
                buyerPharmacy.Balance -= totalAmount;
                
                // 🚫 REMOVED: Seller balance update moved to ProcessBalance (Capture stage)
                // Para havuzda bekleyecek

                // 🆕 Create PROVISION transaction (money blocked, waiting in pool)
                _context.Transactions.Add(new Transaction
                {
                    PharmacyProfileId = buyerPharmacyId,
                    CounterpartyPharmacyId = offer.PharmacyProfileId,
                    OrderId = order.Id,
                    OfferId = offer.Id, // Link to offer for ProcessBalance
                    Type = TransactionType.Purchase,
                    Amount = -totalAmount,
                    Description = $"Provizyon: {orderNumber} - {offer.Medication?.Name}",
                    Date = DateTime.UtcNow,
                    Status = TransactionStatus.Provision // 🆕 Para bloke
                });

                // 🚫 REMOVED: Seller transaction creation moved to ProcessBalance (Capture stage)

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Load for DTO mapping
                var createdOrder = await _context.Orders
                    .Include(o => o.BuyerPharmacy)
                    .Include(o => o.SellerPharmacy)
                    .Include(o => o.OrderItems)
                        .ThenInclude(oi => oi.Medication)
                    .FirstAsync(o => o.Id == order.Id);

                await SendOrderNotificationAsync(buyerPharmacyId, $"Sipariş oluşturuldu: {orderNumber}");

                return OrderResult.Ok(MapToOrderDto(createdOrder));
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return OrderResult.Error($"Sipariş oluşturulurken hata: {ex.Message}");
            }
        }

        public async Task<bool> UpdateOrderStatusAsync(int orderId, string status, long pharmacyId)
        {
            var order = await _context.Orders
                .Include(o => o.BuyerPharmacy)
                .Include(o => o.SellerPharmacy)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null) return false;

            // Authorization: Only seller can update status (or admin)
            if (order.SellerPharmacyId != pharmacyId)
                return false;

            if (!Enum.TryParse<OrderStatus>(status, true, out var newStatus))
                return false;

            order.Status = newStatus;
            order.UpdatedAt = DateTime.UtcNow;

            // If completed, update payment status
            if (newStatus == OrderStatus.Completed || newStatus == OrderStatus.Delivered)
            {
                order.PaymentStatus = PaymentStatus.Paid;
            }

            await _context.SaveChangesAsync();

            await SendOrderNotificationAsync(order.BuyerPharmacyId, 
                $"Sipariş durumu güncellendi: {order.OrderNumber} - {newStatus}");

            return true;
        }

        public async Task<bool> CancelOrderAsync(int orderId, long pharmacyId, string? reason)
        {
            var order = await _context.Orders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Offer)
                .Include(o => o.BuyerPharmacy)
                .Include(o => o.SellerPharmacy)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null) return false;

            // Authorization: Only buyer or seller can cancel
            if (order.BuyerPharmacyId != pharmacyId && order.SellerPharmacyId != pharmacyId)
                return false;

            // Can only cancel pending orders
            if (order.Status != OrderStatus.Pending)
                return false;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Restore stock to offers
                foreach (var item in order.OrderItems)
                {
                    if (item.Offer != null)
                    {
                        item.Offer.SoldQuantity -= item.Quantity;
                        if (item.Offer.SoldQuantity < 0) item.Offer.SoldQuantity = 0;

                        // Reactivate offer if was sold
                        if (item.Offer.Status == OfferStatus.Sold)
                        {
                            item.Offer.Status = OfferStatus.Active;
                        }
                    }
                }

                // Restore balances
                var buyerPharmacy = await _context.PharmacyProfiles.FindAsync(order.BuyerPharmacyId);
                var sellerPharmacy = await _context.PharmacyProfiles.FindAsync(order.SellerPharmacyId);

                if (buyerPharmacy != null)
                {
                    buyerPharmacy.Balance += order.TotalAmount;
                }

                if (sellerPharmacy != null)
                {
                    sellerPharmacy.Balance -= order.TotalAmount;
                }

                // Create refund transactions
                _context.Transactions.Add(new Transaction
                {
                    PharmacyProfileId = order.BuyerPharmacyId,
                    CounterpartyPharmacyId = order.SellerPharmacyId,
                    OrderId = order.Id,
                    Type = TransactionType.Refund,
                    Amount = order.TotalAmount,
                    Description = $"Sipariş iptali: {order.OrderNumber}" + (reason != null ? $" - {reason}" : ""),
                    Date = DateTime.UtcNow,
                    Status = TransactionStatus.Completed
                });

                _context.Transactions.Add(new Transaction
                {
                    PharmacyProfileId = order.SellerPharmacyId,
                    CounterpartyPharmacyId = order.BuyerPharmacyId,
                    OrderId = order.Id,
                    Type = TransactionType.Refund,
                    Amount = -order.TotalAmount,
                    Description = $"Sipariş iptali: {order.OrderNumber}" + (reason != null ? $" - {reason}" : ""),
                    Date = DateTime.UtcNow,
                    Status = TransactionStatus.Completed
                });

                order.Status = OrderStatus.Cancelled;
                order.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                await SendOrderNotificationAsync(order.BuyerPharmacyId, $"Sipariş iptal edildi: {order.OrderNumber}");

                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                return false;
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // Private Helpers
        // ═══════════════════════════════════════════════════════════════

        private static string GenerateOrderNumber()
        {
            var year = DateTime.UtcNow.Year;
            var random = new Random();
            var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var code = new string(Enumerable.Range(0, 4).Select(_ => chars[random.Next(chars.Length)]).ToArray());
            return $"{year}-{code}";
        }

        private async Task SendOrderNotificationAsync(long pharmacyId, string message)
        {
            await _hubContext.Clients.Group(pharmacyId.ToString()).SendAsync("ReceiveNotification", new
            {
                message = message,
                type = "orderUpdate",
                timestamp = DateTime.UtcNow,
                senderId = (string?)null
            });

            // Also notify all clients about the update
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", new
            {
                message = message,
                type = "entityUpdated",
                timestamp = DateTime.UtcNow,
                senderId = (string?)null
            });
        }

        private static OrderDto MapToOrderDto(Order order)
        {
            return new OrderDto
            {
                Id = order.Id,
                OrderNumber = order.OrderNumber,
                BuyerPharmacyId = order.BuyerPharmacyId,
                BuyerPharmacyName = order.BuyerPharmacy?.PharmacyName,
                SellerPharmacyId = order.SellerPharmacyId,
                SellerPharmacyName = order.SellerPharmacy?.PharmacyName,
                TotalAmount = order.TotalAmount,
                Status = order.Status.ToString(),
                PaymentStatus = order.PaymentStatus.ToString(),
                OrderDate = order.OrderDate,
                Items = order.OrderItems?.Select(oi => new OrderItemDto
                {
                    Id = oi.Id,
                    MedicationId = oi.MedicationId,
                    MedicationName = oi.Medication?.Name,
                    MedicationBarcode = oi.Medication?.Barcode,
                    Quantity = oi.Quantity,
                    UnitPrice = oi.UnitPrice,
                    TotalPrice = oi.Quantity * oi.UnitPrice, // Calculated
                    OfferId = oi.OfferId,
                    ProfitAmount = oi.ProfitAmount // Kar miktarı
                }).ToList() ?? new List<OrderItemDto>()
            };
        }
    }
}
