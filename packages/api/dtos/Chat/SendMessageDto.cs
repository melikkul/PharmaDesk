namespace Backend.Dtos.Chat
{
    public class SendMessageDto
    {
        // CRITICAL: String to prevent JavaScript precision loss with large Long IDs
        public string ReceiverId { get; set; }
        public string Content { get; set; }
    }
}