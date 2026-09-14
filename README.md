# RailEase

Open `index.html` in VS Code with Live Server (recommended) or directly in a browser.

## Demo accounts
Passenger: 9876543210 / Passenger@123
Staff: STF1001 / Staff@123
Admin: admin@railease.demo / Admin@123

New passenger registration works and creates a LocalStorage account. Demo OTP is 123456.

## Flow
Passenger: Register/Login → Dashboard → Create Booking → Availability → Fare → Payment → Booking ID → Tracking → Waste/Rewards/Feedback/Profile.
Staff: Login → Assigned Bookings → Accept/Reject → Reached Passenger → Service Started → Completed → Availability.
Admin: Login → Dashboard → Staff/Porter → Wheelchairs → Vehicles → Monitor → Waste Review → Rewards → Redemptions → Complaints → Availability.

This is a frontend prototype. LocalStorage acts as the mock backend. File uploads store filenames only.


## Mandatory Journey Validation
After passenger login, the passenger must validate PNR, train number, journey date, station and platform. Until validation exists in LocalStorage, the booking page and waste upload page redirect to Journey Validation. The validated journey is reused in booking.


## Staff login fix
The app now repairs the demo staff account on every load, so previous LocalStorage data cannot break the demo login. Select **Staff** on `login.html` and use `STF1001` / `Staff@123`.
