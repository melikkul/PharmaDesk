namespace Backend.Dtos.Chat
{
    public class StartConversationDto
    {
        // Changed to string to prevent JavaScript precision loss with large Long IDs
        public string ReceiverPharmacyId { get; set; } = string.Empty;
    }
}