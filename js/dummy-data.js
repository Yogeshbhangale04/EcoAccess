/* Hardcoded / dummy data — change values here, not across the codebase. */
const DUMMY = {
  defaultPassword: "Test@123",
  legacyPasswords: ["Passenger@123", "Staff@123", "Admin@123"],
  adminEmail: "admin@ecoaccess.com",
  demoOtp: "123456",
  demoPassengerMobile: "9876543210",
  demoStaffId: "STF1001",
  stations: ["Mumbai Central", "Thane", "Pune Junction"],
  taxName: "GST",
  taxRate: 0.05,
  serviceFares: {
    Porter: 50,
    Wheelchair: 50,
    "Inter Vehicle": 70,
  },
  porterRates: [
    { value: 50, label: "1–10 kg · ₹50 per bag" },
    { value: 60, label: "11–20 kg · ₹60 per bag" },
    { value: 70, label: "21–30 kg · ₹70 per bag" },
    { value: 80, label: "31+ kg · ₹80 per bag" },
  ],
  limits: {
    pnrLength: 10,
    trainNumberLength: 5,
    platformMin: 1,
    platformMax: 20,
    nameMaxLength: 20,
    mobileLength: 10,
    otpLength: 6,
    passengerMax: 8,
    porterBagsMax: 20,
  },
  rewards: {
    couponPointRate: 0.5,
    couponTtlMs: 24 * 60 * 60 * 1000,
    redeemMinPoints: 100,
    wastePoints: 20,
  },
  pnrs: [
    {
      pnr: "4521987630",
      train: "12951",
      station: "Mumbai Central",
      platform: "4",
      date: "2026-09-20",
      time: "10:30",
      from: "Mumbai Central",
      to: "New Delhi",
      coach: "B2",
      className: "3A",
    },
    {
      pnr: "6109873421",
      train: "11010",
      station: "Thane",
      platform: "2",
      date: "2026-09-22",
      time: "16:00",
      from: "Thane",
      to: "Pune Junction",
      coach: "D1",
      className: "CC",
    },
    {
      pnr: "8234561907",
      train: "12127",
      station: "Pune Junction",
      platform: "1",
      date: "2026-09-25",
      time: "08:15",
      from: "Pune Junction",
      to: "Mumbai CSMT",
      coach: "A1",
      className: "2A",
    },
  ],
  seed: {
    passengers: [
      {
        id: "P1001",
        name: "Ashish Sharma",
        mobile: "+919876543210",
        email: "ashish@gmail.com",
        password: "Test@123",
        points: 320,
      },
      {
        id: "P1002",
        name: "Yogesh Bhangale",
        mobile: "+919988776655",
        email: "yogesh@gmail.com",
        password: "Test@123",
        points: 180,
      },
    ],
    staff: [
      {
        id: "STF1001",
        employeeId: "STF1001",
        name: "Aditya Chavan",
        password: "Test@123",
        role: "Porter",
        status: "Available",
      },
      {
        id: "STF1002",
        employeeId: "STF1002",
        name: "Neeraj",
        password: "Test@123",
        role: "Wheelchair",
        status: "Available",
      },
    ],
    admins: [
      {
        id: "ADM1",
        name: "Administrator",
        email: "admin@ecoaccess.com",
        password: "Test@123",
      },
    ],
    bookings: [
      {
        id: "BK-240101",
        passengerId: "P1001",
        passenger: "Ashish Sharma",
        service: "Wheelchair",
        station: "Mumbai Central",
        platform: "4",
        pickPlatform: "Main entrance, Gate 2",
        dropPlatform: "Platform 5 waiting hall",
        date: "2026-09-15",
        time: "10:30",
        fare: 53,
        status: "Assigned",
        staffId: "STF1002",
        train: "12951",
      },
      {
        id: "BK-240102",
        passengerId: "P1002",
        passenger: "Yogesh Bhangale",
        service: "Porter",
        station: "Thane",
        platform: "2",
        pickPlatform: "Taxi stand",
        dropPlatform: "Platform 1",
        date: "2026-09-16",
        time: "16:00",
        fare: 53,
        status: "Booked",
        staffId: "",
        train: "11010",
      },
    ],
    rewards: [
      {
        id: "R1",
        name: "Free Tea Coupon",
        points: 100,
        description: "Free tea coupon",
      },
      {
        id: "R2",
        name: "Waiting Room Access",
        points: 250,
        description: "Waiting room access",
      },
      {
        id: "R3",
        name: "Discount Voucher",
        points: 400,
        description: "₹100 discount voucher",
      },
    ],
    resources: {
      wheelchairs: [
        { id: "WC1", station: "Mumbai Central", quantity: 8 },
        { id: "WC2", station: "Thane", quantity: 6 },
      ],
      vehicles: [
        { id: "V1", station: "Mumbai Central", count: 6 },
        { id: "V2", station: "Thane", count: 5 },
      ],
    },
  },
};

const DEFAULT_PASSWORD = DUMMY.defaultPassword;
const LEGACY_PASSWORDS = DUMMY.legacyPasswords;
const ADMIN_EMAIL = DUMMY.adminEmail;
const DEMO_PNRS = DUMMY.pnrs;

DUMMY.seed.passengers.forEach((x) => (x.password = DUMMY.defaultPassword));
DUMMY.seed.staff.forEach((x) => (x.password = DUMMY.defaultPassword));
DUMMY.seed.admins.forEach((x) => {
  x.password = DUMMY.defaultPassword;
  x.email = DUMMY.adminEmail;
});
