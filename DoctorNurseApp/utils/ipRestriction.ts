// app/utils/ipRestriction.ts

const ALLOWED_IP_RANGES = [
  // IIT Dharwad Wellness Center IP Range
  // Example: 10.0.0.0 to 10.0.0.255
  { start: '10.0.0.0', end: '10.0.0.255' },
  // Add more ranges as needed
  // { start: '192.168.1.0', end: '192.168.1.255' },
];

// For development/testing - set to true to bypass IP check
const BYPASS_IP_CHECK = __DEV__; // or set to false in production

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function isIPInRange(ip: string, start: string, end: string): boolean {
  const ipNum = ipToNumber(ip);
  const startNum = ipToNumber(start);
  const endNum = ipToNumber(end);
  return ipNum >= startNum && ipNum <= endNum;
}

export async function checkIPAccess(): Promise<{ allowed: boolean; ip: string }> {
  if (BYPASS_IP_CHECK) {
    return { allowed: true, ip: 'development' };
  }

  try {
    // Get device IP address
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    const userIP = data.ip;

    // Check if IP is in allowed ranges
    const isAllowed = ALLOWED_IP_RANGES.some((range) =>
      isIPInRange(userIP, range.start, range.end)
    );

    return { allowed: isAllowed, ip: userIP };
  } catch (error) {
    console.error('IP check failed:', error);
    return { allowed: false, ip: 'unknown' };
  }
}