using System;

namespace Backend.Utils
{
    public static class IdGenerator
    {
        private static readonly object _lock = new object();
        private static long _lastTimestamp = 0;
        private static int _counter = 0;

        /// <summary>
        /// Generates a unique timestamp-based ID in format: yyyyMMddHHmmssfff
        /// Example: 20251123233000765
        /// </summary>
        public static long GenerateTimestampId()
        {
            lock (_lock)
            {
                var now = DateTime.UtcNow;
                var timestamp = long.Parse(now.ToString("yyyyMMddHHmmssfff"));

                // If same millisecond, increment counter
                if (timestamp == _lastTimestamp)
                {
                    _counter++;
                    // Add counter to ensure uniqueness (max 999 per millisecond)
                    if (_counter > 999)
                    {
                        // Wait 1ms if we've exhausted counter space
                        System.Threading.Thread.Sleep(1);
                        return GenerateTimestampId();
                    }
                    timestamp = timestamp * 1000 + _counter;
                }
                else
                {
                    _counter = 0;
                    _lastTimestamp = timestamp;
                }

                return timestamp;
            }
        }
    }
}
