using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Backend.Services
{
    /// <summary>
    /// Cryptographic service for generating secure shipment tokens using AES-256.
    /// Used for QR code generation in shipment labels.
    /// </summary>
    public interface ICryptoService
    {
        /// <summary>
        /// Generate an encrypted shipment token for QR code display.
        /// Payload: { "id": shipmentId, "ts": DateTime.UtcNow.Ticks, "salt": Guid.NewGuid() }
        /// </summary>
        /// <param name="shipmentId">The shipment ID to encode</param>
        /// <returns>URL-safe Base64 encrypted string</returns>
        string GenerateShipmentToken(int shipmentId);
        
        /// <summary>
        /// Decrypt a shipment token and extract the shipment ID.
        /// </summary>
        /// <param name="encryptedToken">The encrypted token from QR code</param>
        /// <returns>The shipment ID if valid, null if invalid/tampered</returns>
        int? DecryptShipmentToken(string encryptedToken);
    }

    public class CryptoService : ICryptoService
    {
        private readonly byte[] _key;
        private const int KeySize = 256;
        private const int BlockSize = 128;

        public CryptoService(IConfiguration configuration)
        {
            var keyString = configuration["Crypto:ShipmentKey"] 
                ?? Environment.GetEnvironmentVariable("CRYPTO_SHIPMENT_KEY")
                ?? throw new InvalidOperationException("Crypto:ShipmentKey is not configured in appsettings.json or environment variables");
            
            // Derive a 256-bit key from the configuration string using SHA256
            using var sha256 = SHA256.Create();
            _key = sha256.ComputeHash(Encoding.UTF8.GetBytes(keyString));
        }

        public string GenerateShipmentToken(int shipmentId)
        {
            // Create payload with shipment ID, timestamp, and random salt
            var payload = new ShipmentTokenPayload
            {
                Id = shipmentId,
                Ts = DateTime.UtcNow.Ticks,
                Salt = Guid.NewGuid().ToString()
            };

            var jsonPayload = JsonSerializer.Serialize(payload);
            var encryptedBytes = Encrypt(jsonPayload);
            
            // Return URL-safe Base64 string
            return Convert.ToBase64String(encryptedBytes)
                .Replace('+', '-')
                .Replace('/', '_')
                .TrimEnd('=');
        }

        public int? DecryptShipmentToken(string encryptedToken)
        {
            try
            {
                // Convert URL-safe Base64 back to standard Base64
                var base64 = encryptedToken
                    .Replace('-', '+')
                    .Replace('_', '/');
                
                // Add padding if necessary
                switch (base64.Length % 4)
                {
                    case 2: base64 += "=="; break;
                    case 3: base64 += "="; break;
                }

                var encryptedBytes = Convert.FromBase64String(base64);
                var decryptedJson = Decrypt(encryptedBytes);
                
                var payload = JsonSerializer.Deserialize<ShipmentTokenPayload>(decryptedJson);
                return payload?.Id;
            }
            catch
            {
                // Token is invalid or tampered
                return null;
            }
        }

        private byte[] Encrypt(string plainText)
        {
            using var aes = Aes.Create();
            aes.KeySize = KeySize;
            aes.BlockSize = BlockSize;
            aes.Key = _key;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;
            
            // Generate random IV for each encryption
            aes.GenerateIV();

            using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
            using var ms = new MemoryStream();
            
            // Prepend IV to encrypted data
            ms.Write(aes.IV, 0, aes.IV.Length);
            
            using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
            using (var sw = new StreamWriter(cs))
            {
                sw.Write(plainText);
            }

            return ms.ToArray();
        }

        private string Decrypt(byte[] cipherTextWithIv)
        {
            using var aes = Aes.Create();
            aes.KeySize = KeySize;
            aes.BlockSize = BlockSize;
            aes.Key = _key;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            // Extract IV from beginning of cipher text
            var iv = new byte[aes.BlockSize / 8];
            Array.Copy(cipherTextWithIv, 0, iv, 0, iv.Length);
            aes.IV = iv;

            var cipherText = new byte[cipherTextWithIv.Length - iv.Length];
            Array.Copy(cipherTextWithIv, iv.Length, cipherText, 0, cipherText.Length);

            using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
            using var ms = new MemoryStream(cipherText);
            using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
            using var sr = new StreamReader(cs);
            
            return sr.ReadToEnd();
        }

        private class ShipmentTokenPayload
        {
            [System.Text.Json.Serialization.JsonPropertyName("id")]
            public int Id { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("ts")]
            public long Ts { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("salt")]
            public string Salt { get; set; } = string.Empty;
        }
    }
}
