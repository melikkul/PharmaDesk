using System.Text.Json;
using System.Text.RegularExpressions;

namespace PharmaDesk.API.Services
{
    /// <summary>
    /// Sensitive Data Masker for KVKK/GDPR Compliance.
    /// Masks passwords, tokens, credit card numbers, and other sensitive data
    /// in log entries before storage.
    /// </summary>
    public static class SensitiveDataMasker
    {
        // Sensitive field names (case-insensitive)
        private static readonly string[] SensitiveFields =
        {
            "password",
            "passwd",
            "secret",
            "token",
            "apikey",
            "api_key",
            "authorization",
            "bearer",
            "jwt",
            "accesstoken",
            "access_token",
            "refreshtoken",
            "refresh_token",
            "creditcard",
            "credit_card",
            "cardnumber",
            "card_number",
            "cvv",
            "cvc",
            "ssn",
            "socialsecurity",
            "taxid",
            "tckn", // Turkish Citizen ID
            "kimliknumarasi"
        };

        // Regex patterns for sensitive data
        private static readonly Regex CreditCardRegex = new(
            @"\b(?:\d{4}[\s\-]?){3}\d{4}\b",
            RegexOptions.Compiled);

        private static readonly Regex JwtRegex = new(
            @"eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+",
            RegexOptions.Compiled);

        private static readonly Regex BearerTokenRegex = new(
            @"Bearer\s+[a-zA-Z0-9_-]+",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private const string MaskedPassword = "***MASKED***";
        private const string MaskedToken = "***TOKEN***";
        private const string MaskedCardPrefix = "****-****-****-";

        /// <summary>
        /// Masks sensitive data in a JSON string
        /// </summary>
        public static string MaskJsonString(string? jsonString)
        {
            if (string.IsNullOrEmpty(jsonString))
                return jsonString ?? string.Empty;

            try
            {
                using var doc = JsonDocument.Parse(jsonString);
                var maskedDict = MaskJsonElement(doc.RootElement);
                return JsonSerializer.Serialize(maskedDict);
            }
            catch
            {
                // If not valid JSON, mask as plain string
                return MaskPlainString(jsonString);
            }
        }

        /// <summary>
        /// Masks sensitive data in a plain string
        /// </summary>
        public static string MaskPlainString(string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;

            var result = input;

            // Mask credit card numbers (keep last 4 digits)
            result = CreditCardRegex.Replace(result, match =>
            {
                var lastFour = match.Value.Replace(" ", "").Replace("-", "");
                return MaskedCardPrefix + lastFour[^4..];
            });

            // Mask JWT tokens
            result = JwtRegex.Replace(result, MaskedToken);

            // Mask Bearer tokens
            result = BearerTokenRegex.Replace(result, "Bearer " + MaskedToken);

            return result;
        }

        /// <summary>
        /// Masks sensitive fields in a dictionary
        /// </summary>
        public static Dictionary<string, object?> MaskDictionary(Dictionary<string, object?> data)
        {
            var result = new Dictionary<string, object?>();

            foreach (var kvp in data)
            {
                if (IsSensitiveField(kvp.Key))
                {
                    result[kvp.Key] = MaskedPassword;
                }
                else if (kvp.Value is string strValue)
                {
                    result[kvp.Key] = MaskPlainString(strValue);
                }
                else if (kvp.Value is Dictionary<string, object?> nestedDict)
                {
                    result[kvp.Key] = MaskDictionary(nestedDict);
                }
                else
                {
                    result[kvp.Key] = kvp.Value;
                }
            }

            return result;
        }

        /// <summary>
        /// Recursively masks sensitive data in a JsonElement
        /// </summary>
        private static object? MaskJsonElement(JsonElement element)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.Object:
                    var dict = new Dictionary<string, object?>();
                    foreach (var property in element.EnumerateObject())
                    {
                        if (IsSensitiveField(property.Name))
                        {
                            dict[property.Name] = MaskedPassword;
                        }
                        else
                        {
                            dict[property.Name] = MaskJsonElement(property.Value);
                        }
                    }
                    return dict;

                case JsonValueKind.Array:
                    var list = new List<object?>();
                    foreach (var item in element.EnumerateArray())
                    {
                        list.Add(MaskJsonElement(item));
                    }
                    return list;

                case JsonValueKind.String:
                    return MaskPlainString(element.GetString() ?? string.Empty);

                case JsonValueKind.Number:
                    return element.GetRawText();

                case JsonValueKind.True:
                    return true;

                case JsonValueKind.False:
                    return false;

                case JsonValueKind.Null:
                default:
                    return null;
            }
        }

        /// <summary>
        /// Checks if a field name is sensitive
        /// </summary>
        private static bool IsSensitiveField(string fieldName)
        {
            var lowerName = fieldName.ToLowerInvariant().Replace("_", "").Replace("-", "");
            
            foreach (var sensitive in SensitiveFields)
            {
                if (lowerName.Contains(sensitive.Replace("_", "")))
                    return true;
            }

            return false;
        }

        /// <summary>
        /// Masks console log entries from frontend
        /// </summary>
        public static List<object> MaskClientLogs(List<Dictionary<string, object>> logs)
        {
            var masked = new List<object>();

            foreach (var log in logs)
            {
                var maskedLog = new Dictionary<string, object?>();
                
                foreach (var kvp in log)
                {
                    if (kvp.Key == "message" && kvp.Value is string msg)
                    {
                        maskedLog[kvp.Key] = MaskPlainString(msg);
                    }
                    else if (kvp.Value is string strValue)
                    {
                        maskedLog[kvp.Key] = MaskPlainString(strValue);
                    }
                    else
                    {
                        maskedLog[kvp.Key] = kvp.Value;
                    }
                }

                masked.Add(maskedLog);
            }

            return masked;
        }
    }
}
