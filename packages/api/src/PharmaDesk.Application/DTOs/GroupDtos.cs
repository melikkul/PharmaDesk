namespace PharmaDesk.Application.DTOs
{
    public class GroupMemberStatisticsDto
    {
        public string GroupName { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string PharmacyName { get; set; } = string.Empty;
        public decimal Balance { get; set; }
        public decimal GroupLoad { get; set; }
        public int PurchaseCount { get; set; }
        public decimal PurchaseAmount { get; set; }
        public decimal SystemEarnings { get; set; }
        public int OfferCount { get; set; }
        public int ShipmentCount { get; set; }
        public decimal ShipmentAmount { get; set; }
        public decimal GroupContribution { get; set; }
        public decimal TotalProfit { get; set; } // 🆕 Toplam kar
    }

    public class GroupStatisticsRequest
    {
        public string? PharmacyName { get; set; }
        public string? District { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class GroupDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int CityId { get; set; }
        public string CityName { get; set; } = string.Empty;
    }
}
