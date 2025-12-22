namespace Backend.Models
{
    /// <summary>
    /// Konuşma türü: Grup sohbeti veya 1:1 bireysel sohbet
    /// </summary>
    public enum ConversationType
    {
        /// <summary>
        /// 1:1 Bireysel sohbet
        /// </summary>
        Direct = 0,

        /// <summary>
        /// Grup sohbeti (PharmacyGroup bazlı)
        /// </summary>
        Group = 1
    }
}
