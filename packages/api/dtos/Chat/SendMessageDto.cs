using System;

namespace Backend.Dtos.Chat
{
    public class SendMessageDto
    {
        public long ReceiverId { get; set; }
        public string Content { get; set; }
    }
}
