namespace PharmaDesk.Application.DTOs
{
    /// <summary>
    /// Kullanıcının abonelik plan bilgisi - GET /api/subscription/my-plan için
    /// </summary>
    public class SubscriptionPlanDto
    {
        /// <summary>
        /// Mevcut abonelik durumu
        /// </summary>
        public string Status { get; set; } = "Trial";

        /// <summary>
        /// Plan tipi (Standard, CargoPlus)
        /// </summary>
        public string PlanType { get; set; } = "Standard";

        /// <summary>
        /// Ödemesi gereken tutar (TL)
        /// Grup özel fiyatı varsa o, yoksa default fiyat
        /// </summary>
        public decimal PriceToPayMonthly { get; set; }

        /// <summary>
        /// Temel abonelik fiyatı (kargo hariç)
        /// </summary>
        public decimal BasePrice { get; set; }

        /// <summary>
        /// Kargo hizmeti fiyatı (grup kargo aktifse)
        /// </summary>
        public decimal CargoPrice { get; set; }

        /// <summary>
        /// Kargo hizmeti aktif mi?
        /// </summary>
        public bool HasCargoService { get; set; }

        /// <summary>
        /// Özel fiyat uygulanıyor mu?
        /// </summary>
        public bool HasCustomPrice { get; set; }

        /// <summary>
        /// Abonelik bitiş tarihi
        /// </summary>
        public DateTime? ExpireDate { get; set; }

        /// <summary>
        /// Kalan gün sayısı
        /// </summary>
        public int? DaysRemaining { get; set; }

        /// <summary>
        /// Son ödeme tarihi
        /// </summary>
        public DateTime? LastPaymentDate { get; set; }

        /// <summary>
        /// Eczanenin bağlı olduğu grupların adları
        /// </summary>
        public List<string> GroupNames { get; set; } = new();
    }

    /// <summary>
    /// Ödeme isteği - POST /api/subscription/pay için
    /// </summary>
    public class PaymentRequestDto
    {
        /// <summary>
        /// Kart numarası (16 haneli)
        /// </summary>
        public string CardNumber { get; set; } = string.Empty;

        /// <summary>
        /// Son kullanma ayı (01-12)
        /// </summary>
        public string ExpiryMonth { get; set; } = string.Empty;

        /// <summary>
        /// Son kullanma yılı (YY format)
        /// </summary>
        public string ExpiryYear { get; set; } = string.Empty;

        /// <summary>
        /// CVC/CVV kodu
        /// </summary>
        public string Cvc { get; set; } = string.Empty;

        /// <summary>
        /// Kart sahibi adı
        /// </summary>
        public string CardHolderName { get; set; } = string.Empty;
    }

    /// <summary>
    /// Ödeme sonucu - POST /api/subscription/pay response
    /// </summary>
    public class PaymentResultDto
    {
        /// <summary>
        /// İşlem başarılı mı?
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// Mesaj
        /// </summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// İşlem ID (Gateway transaction ID)
        /// </summary>
        public string? TransactionId { get; set; }

        /// <summary>
        /// Yeni abonelik bitiş tarihi
        /// </summary>
        public DateTime? NewExpireDate { get; set; }

        /// <summary>
        /// Ödenen tutar
        /// </summary>
        public decimal? AmountPaid { get; set; }

        /// <summary>
        /// Yeni JWT Token (abonelik durumu güncellenmiş)
        /// Kullanıcı bu token'ı set ederse middleware'dan geçebilir
        /// </summary>
        public string? NewAccessToken { get; set; }

        /// <summary>
        /// Yeni Refresh Token
        /// </summary>
        public string? NewRefreshToken { get; set; }
    }

    /// <summary>
    /// Grup fiyatlandırma güncelleme - PUT /api/admin/groups/{id}/pricing
    /// </summary>
    public class GroupPricingDto
    {
        /// <summary>
        /// Özel abonelik fiyatı (null = default 400 TL)
        /// </summary>
        public decimal? CustomSubscriptionPrice { get; set; }

        /// <summary>
        /// Kargo hizmeti aktif mi?
        /// </summary>
        public bool HasCargoService { get; set; }

        /// <summary>
        /// 🆕 Özel kargo fiyatı (varsayılan 2450 TL)
        /// </summary>
        public decimal? CargoPrice { get; set; }
    }

    /// <summary>
    /// Grup üye finansal durumu - Admin panel için
    /// </summary>
    public class GroupMemberFinancialDto
    {
        /// <summary>
        /// JSON'da string olarak serialize edilir (JavaScript BigInt precision fix)
        /// </summary>
        [System.Text.Json.Serialization.JsonConverter(typeof(LongToStringConverter))]
        public long PharmacyId { get; set; }
        public string PharmacyName { get; set; } = string.Empty;
        public string? OwnerName { get; set; }

        /// <summary>
        /// Login durumu (aktif/pasif)
        /// </summary>
        public bool IsActive { get; set; }

        /// <summary>
        /// Abonelik durumu (ödendi/ödenmedi)
        /// </summary>
        public string SubscriptionStatus { get; set; } = "Trial";

        /// <summary>
        /// Abonelik başlangıç tarihi
        /// </summary>
        public DateTime? SubscriptionStartDate { get; set; }

        /// <summary>
        /// Abonelik bitiş tarihi
        /// </summary>
        public DateTime? SubscriptionExpireDate { get; set; }

        /// <summary>
        /// Kalan gün sayısı
        /// </summary>
        public int? DaysRemaining { get; set; }

        /// <summary>
        /// Sanal bakiye (takas puanı) - Mavi renk
        /// </summary>
        public decimal VirtualBalance { get; set; }

        /// <summary>
        /// 🆕 Bakiye alt limiti
        /// </summary>
        public decimal BalanceLimit { get; set; }

        /// <summary>
        /// Toplam satış tutarı (sanal)
        /// </summary>
        public decimal TotalSales { get; set; }

        /// <summary>
        /// Satış adedi
        /// </summary>
        public int SalesCount { get; set; }

        /// <summary>
        /// Toplam alış tutarı (sanal)
        /// </summary>
        public decimal TotalPurchases { get; set; }

        /// <summary>
        /// Alış adedi
        /// </summary>
        public int PurchasesCount { get; set; }

        /// <summary>
        /// Tahmini kar (Satışlar - Alışlar)
        /// </summary>
        public decimal EstimatedProfit { get; set; }

        /// <summary>
        /// Adet başı ortalama kar
        /// </summary>
        public decimal AverageProfitPerUnit { get; set; }

        // 🆕 Discount fields
        /// <summary>
        /// Yüzdelik indirim oranı
        /// </summary>
        public decimal? DiscountPercent { get; set; }

        /// <summary>
        /// Sabit TL indirim tutarı
        /// </summary>
        public decimal? DiscountAmount { get; set; }

        /// <summary>
        /// 🆕 Abone olduğu ay sayısı
        /// </summary>
        public int SubscriptionMonths { get; set; }

        /// <summary>
        /// 🆕 Ödeme durumu (Ödendi, Beklemede, vb.)
        /// </summary>
        public string PaymentStatus { get; set; } = "Beklemede";
    }

    /// <summary>
    /// Grup finansal özeti - Admin panel için
    /// </summary>
    public class GroupFinancialSummaryDto
    {
        public int GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public string CityName { get; set; } = string.Empty;

        /// <summary>
        /// Toplam üye sayısı
        /// </summary>
        public int TotalMembers { get; set; }

        /// <summary>
        /// Aktif aboneliklere sahip üye sayısı
        /// </summary>
        public int ActiveSubscriptions { get; set; }

        /// <summary>
        /// Özel fiyat var mı?
        /// </summary>
        public bool HasCustomPrice { get; set; }

        /// <summary>
        /// Özel fiyat tutarı
        /// </summary>
        public decimal? CustomPrice { get; set; }

        /// <summary>
        /// Kargo hizmeti aktif mi?
        /// </summary>
        public bool HasCargoService { get; set; }

        /// <summary>
        /// 🆕 Kargo fiyatı
        /// </summary>
        public decimal CargoPrice { get; set; } = 2450;

        /// <summary>
        /// 🆕 Toplam onaylanan ödeme miktarı
        /// </summary>
        public decimal TotalConfirmedPayments { get; set; }

        /// <summary>
        /// Üye listesi
        /// </summary>
        public List<GroupMemberFinancialDto> Members { get; set; } = new();
    }

    /// <summary>
    /// JavaScript BigInt precision sorununu önlemek için long'u string olarak serialize eder
    /// </summary>
    public class LongToStringConverter : System.Text.Json.Serialization.JsonConverter<long>
    {
        public override long Read(ref System.Text.Json.Utf8JsonReader reader, Type typeToConvert, System.Text.Json.JsonSerializerOptions options)
        {
            if (reader.TokenType == System.Text.Json.JsonTokenType.String)
            {
                return long.Parse(reader.GetString()!);
            }
            return reader.GetInt64();
        }

        public override void Write(System.Text.Json.Utf8JsonWriter writer, long value, System.Text.Json.JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToString());
        }
    }
}
