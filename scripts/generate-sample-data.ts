import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { format, subDays, addDays } from 'date-fns';

const today = new Date();
const todayStr = format(today, 'yyyy-MM-dd');

// 1. Categories
const categories = [
  { id: 'groceries', name: 'Groceries', icon: 'ShoppingCart', color: '#10B981', isDefault: true },
  { id: 'food', name: 'Food & Dining', icon: 'Utensils', color: '#F59E0B', isDefault: true },
  { id: 'transportation', name: 'Transportation', icon: 'Car', color: '#3B82F6', isDefault: true },
  { id: 'entertainment', name: 'Entertainment', icon: 'Film', color: '#8B5CF6', isDefault: true },
  { id: 'utilities', name: 'Utilities & Bills', icon: 'Zap', color: '#EF4444', isDefault: true },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#EC4899', isDefault: true },
  { id: 'health', name: 'Healthcare', icon: 'HeartPulse', color: '#14B8A6', isDefault: true },
  { id: 'travel', name: 'Travel & Trips', icon: 'Plane', color: '#06B6D4', isDefault: true },
  { id: 'education', name: 'Education & Courses', icon: 'GraduationCap', color: '#6366F1', isDefault: true },
  { id: 'investments', name: 'Investments & SIP', icon: 'TrendingUp', color: '#84CC16', isDefault: true },
  { id: 'gifts', name: 'Gifts & Charity', icon: 'Gift', color: '#F43F5E', isDefault: true },
  { id: 'freelance_tools', name: 'Software & Tools', icon: 'Laptop', color: '#A855F7', isDefault: false },
  { id: 'pets', name: 'Pet Care', icon: 'Cat', color: '#FB923C', isDefault: false },
  { id: 'fitness', name: 'Gym & Fitness', icon: 'Dumbbell', color: '#0284C7', isDefault: false },
  { id: 'home_improvement', name: 'Home Renovation', icon: 'Home', color: '#D97706', isDefault: false },
];

// 2. Recurring Expenses Rules (15+ rules)
const recurringExpenses = [
  {
    id: 'rec-exp-netflix',
    items: 'Netflix 4K UHD Plan',
    amount: 649,
    category: 'entertainment',
    frequency: 'monthly',
    customIntervalCount: 1,
    customIntervalUnit: 'months',
    paymentMethod: 'Credit Card',
    account: 'HDFC CC',
    startDate: format(subDays(today, 60), 'yyyy-MM-05'),
    lastGeneratedDate: format(subDays(today, 15), 'yyyy-MM-05'),
    where: 'Netflix.com',
    note: 'Premium 4-screen streaming subscription',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-exp-spotify',
    items: 'Spotify Duo Family Plan',
    amount: 179,
    category: 'entertainment',
    frequency: 'monthly',
    customIntervalCount: 1,
    customIntervalUnit: 'months',
    paymentMethod: 'UPI',
    account: 'SBI',
    startDate: format(subDays(today, 90), 'yyyy-MM-10'),
    lastGeneratedDate: format(subDays(today, 10), 'yyyy-MM-10'),
    where: 'Spotify',
    note: 'High-res music streaming',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-exp-fiber',
    items: 'Airtel Xstream Fiber 300Mbps',
    amount: 1179,
    category: 'utilities',
    frequency: 'monthly',
    customIntervalCount: 1,
    customIntervalUnit: 'months',
    paymentMethod: 'Auto-Debit',
    account: 'ICICI Bank',
    startDate: format(subDays(today, 120), 'yyyy-MM-01'),
    lastGeneratedDate: format(subDays(today, 20), 'yyyy-MM-01'),
    where: 'Airtel',
    note: 'Home Broadband & DTH combo',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-exp-sip-nifty',
    items: 'Nifty 50 Index Fund SIP',
    amount: 10000,
    category: 'investments',
    frequency: 'monthly',
    customIntervalCount: 1,
    customIntervalUnit: 'months',
    paymentMethod: 'NetBanking',
    account: 'SBI',
    startDate: format(subDays(today, 180), 'yyyy-MM-07'),
    lastGeneratedDate: format(subDays(today, 13), 'yyyy-MM-07'),
    where: 'Zerodha Coin',
    note: 'Automated monthly wealth accumulation',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-exp-sip-nasdaq',
    items: 'Mirae Asset US Tech Top ETF SIP',
    amount: 5000,
    category: 'investments',
    frequency: 'monthly',
    customIntervalCount: 1,
    customIntervalUnit: 'months',
    paymentMethod: 'NetBanking',
    account: 'SBI',
    startDate: format(subDays(today, 150), 'yyyy-MM-15'),
    lastGeneratedDate: format(subDays(today, 5), 'yyyy-MM-15'),
    where: 'Groww',
    note: 'Global tech diversification',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-exp-milk',
    items: 'Organic Farm Milk Delivery',
    amount: 90,
    category: 'groceries',
    frequency: 'daily',
    customIntervalCount: 1,
    customIntervalUnit: 'days',
    paymentMethod: 'Wallet',
    account: 'Country Delight',
    startDate: format(subDays(today, 14), 'yyyy-MM-dd'),
    lastGeneratedDate: format(subDays(today, 1), 'yyyy-MM-dd'),
    where: 'Doorstep Delivery',
    note: '1.5 Litre A2 Cow Milk daily',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-exp-gym',
    items: 'Gold Gym Elite Membership',
    amount: 3500,
    category: 'fitness',
    frequency: 'monthly',
    customIntervalCount: 1,
    customIntervalUnit: 'months',
    paymentMethod: 'UPI',
    account: 'Google Pay',
    startDate: format(subDays(today, 90), 'yyyy-MM-01'),
    lastGeneratedDate: format(subDays(today, 20), 'yyyy-MM-01'),
    where: 'Gold Gym Center',
    note: 'Includes sauna & crossfit access',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-exp-chatgpt',
    items: 'ChatGPT Plus Subscription',
    amount: 1999,
    category: 'freelance_tools',
    frequency: 'monthly',
    customIntervalCount: 1,
    customIntervalUnit: 'months',
    paymentMethod: 'Credit Card',
    account: 'HDFC CC',
    startDate: format(subDays(today, 100), 'yyyy-MM-18'),
    lastGeneratedDate: format(subDays(today, 2), 'yyyy-MM-18'),
    where: 'OpenAI',
    note: 'AI productivity research & coding assistance',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-exp-github',
    items: 'GitHub Copilot Pro',
    amount: 850,
    category: 'freelance_tools',
    frequency: 'monthly',
    customIntervalCount: 1,
    customIntervalUnit: 'months',
    paymentMethod: 'Credit Card',
    account: 'HDFC CC',
    startDate: format(subDays(today, 110), 'yyyy-MM-12'),
    lastGeneratedDate: format(subDays(today, 8), 'yyyy-MM-12'),
    where: 'GitHub.com',
    note: 'Code autocompletion suite',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-exp-veggies',
    items: 'Weekly Hydroponic Organic Veggies Basket',
    amount: 1200,
    category: 'groceries',
    frequency: 'weekly',
    customIntervalCount: 1,
    customIntervalUnit: 'weeks',
    paymentMethod: 'UPI',
    account: 'SBI',
    startDate: format(subDays(today, 28), 'yyyy-MM-dd'),
    lastGeneratedDate: format(subDays(today, 7), 'yyyy-MM-dd'),
    where: 'Farmers Market',
    note: 'Weekly curated fresh vegetables box',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-exp-cleaning',
    items: 'Deep House Cleaning & Sanitization',
    amount: 2800,
    category: 'home_improvement',
    frequency: 'custom',
    customIntervalCount: 2,
    customIntervalUnit: 'months',
    paymentMethod: 'UPI',
    account: 'SBI',
    startDate: format(subDays(today, 90), 'yyyy-MM-15'),
    lastGeneratedDate: format(subDays(today, 30), 'yyyy-MM-15'),
    where: 'Urban Company',
    note: 'Bi-monthly thorough deep cleaning service',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-exp-term-insurance',
    items: 'HDFC Life Term Insurance 1Cr Cover',
    amount: 14500,
    category: 'utilities',
    frequency: 'yearly',
    customIntervalCount: 1,
    customIntervalUnit: 'years',
    paymentMethod: 'NetBanking',
    account: 'SBI',
    startDate: format(subDays(today, 365), 'yyyy-MM-10'),
    lastGeneratedDate: format(subDays(today, 365), 'yyyy-MM-10'),
    where: 'HDFC Life',
    note: 'Annual term plan premium under Section 80C',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-exp-cloud-vps',
    items: 'DigitalOcean Cloud Kubernetes Cluster',
    amount: 3200,
    category: 'freelance_tools',
    frequency: 'monthly',
    customIntervalCount: 1,
    customIntervalUnit: 'months',
    paymentMethod: 'Credit Card',
    account: 'HDFC CC',
    startDate: format(subDays(today, 90), 'yyyy-MM-01'),
    lastGeneratedDate: format(subDays(today, 20), 'yyyy-MM-01'),
    where: 'DigitalOcean',
    note: 'App staging servers & staging databases',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 3. Recurring Dues & Receivables (10+ rules)
const recurringDebts = [
  {
    id: 'rec-due-landlord',
    type: 'due',
    personName: 'Ramesh Sharma (Landlord)',
    amount: 28000,
    purpose: 'Monthly Penthouse Apartment Rent',
    frequency: 'monthly',
    customIntervalCount: 1,
    customIntervalUnit: 'months',
    startDate: format(subDays(today, 90), 'yyyy-MM-01'),
    lastGeneratedDate: format(subDays(today, 20), 'yyyy-MM-01'),
    location: 'Bangalore Indiranagar',
    notes: 'Pay via NEFT by 5th of each calendar month',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-due-maid',
    type: 'due',
    personName: 'Lakshmi Amma (Housekeeping)',
    amount: 5500,
    purpose: 'Monthly Cook & Cleaning Remuneration',
    frequency: 'monthly',
    customIntervalCount: 1,
    customIntervalUnit: 'months',
    startDate: format(subDays(today, 90), 'yyyy-MM-01'),
    lastGeneratedDate: format(subDays(today, 20), 'yyyy-MM-01'),
    location: 'Home',
    notes: 'Pay on the 1st of every month via UPI',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-due-trainer',
    type: 'due',
    personName: 'Vikram Singh (Personal Trainer)',
    amount: 8000,
    purpose: 'Weekly Crossfit & Nutrition Coaching Fee',
    frequency: 'monthly',
    customIntervalCount: 1,
    customIntervalUnit: 'months',
    startDate: format(subDays(today, 60), 'yyyy-MM-10'),
    lastGeneratedDate: format(subDays(today, 10), 'yyyy-MM-10'),
    location: 'Cult Fit Center',
    notes: 'Personal training & macro guidance fee',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-rec-retainer-client',
    type: 'receivable',
    personName: 'Apex Labs Inc (San Francisco)',
    amount: 75000,
    purpose: 'Monthly AI UX Consulting Retainer',
    frequency: 'monthly',
    customIntervalCount: 1,
    customIntervalUnit: 'months',
    startDate: format(subDays(today, 120), 'yyyy-MM-01'),
    lastGeneratedDate: format(subDays(today, 20), 'yyyy-MM-01'),
    location: 'Remote US Client',
    notes: 'Wire transferred via Wise on the 1st of every month',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-rec-sublet-roommate',
    type: 'receivable',
    personName: 'Ananya Verma (Flatmate)',
    amount: 14000,
    purpose: 'Half Share of Apartment Rent & Utilities',
    frequency: 'monthly',
    customIntervalCount: 1,
    customIntervalUnit: 'months',
    startDate: format(subDays(today, 90), 'yyyy-MM-03'),
    lastGeneratedDate: format(subDays(today, 17), 'yyyy-MM-03'),
    location: 'Apartment Split',
    notes: 'Transfers directly to GPay on 3rd of month',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-rec-mentor-fee',
    type: 'receivable',
    personName: 'Techstars Accelerator',
    amount: 15000,
    purpose: 'Bi-weekly Startup Design Mentorship Honorarium',
    frequency: 'custom',
    customIntervalCount: 2,
    customIntervalUnit: 'weeks',
    startDate: format(subDays(today, 30), 'yyyy-MM-dd'),
    lastGeneratedDate: format(subDays(today, 14), 'yyyy-MM-dd'),
    location: 'Online Sessions',
    notes: 'Design sprints and pitch deck feedback mentoring',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-due-society',
    type: 'due',
    personName: 'Greenwood Heights RWA',
    amount: 4200,
    purpose: 'Quarterly Society Maintenance & Security Fund',
    frequency: 'custom',
    customIntervalCount: 3,
    customIntervalUnit: 'months',
    startDate: format(subDays(today, 90), 'yyyy-MM-01'),
    lastGeneratedDate: format(subDays(today, 90), 'yyyy-MM-01'),
    location: 'Society Office',
    notes: 'Building maintenance, swimming pool & 24/7 security charges',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 4. Budgets
const budgets = [
  { id: 'b-overall', name: 'Overall Monthly Cap', amount: 80000, category: 'overall', period: 'monthly', startDate: format(today, 'yyyy-MM-01'), isActive: true },
  { id: 'b-food', name: 'Food & Dining Out', amount: 15000, category: 'food', period: 'monthly', startDate: format(today, 'yyyy-MM-01'), isActive: true },
  { id: 'b-groceries', name: 'Supermarket & Pantry', amount: 12000, category: 'groceries', period: 'monthly', startDate: format(today, 'yyyy-MM-01'), isActive: true },
  { id: 'b-shopping', name: 'Lifestyle & Clothes', amount: 10000, category: 'shopping', period: 'monthly', startDate: format(today, 'yyyy-MM-01'), isActive: true },
  { id: 'b-entertainment', name: 'OTT & Leisure', amount: 4000, category: 'entertainment', period: 'monthly', startDate: format(today, 'yyyy-MM-01'), isActive: true },
  { id: 'b-transport', name: 'Fuel & Cabs', amount: 6000, category: 'transportation', period: 'monthly', startDate: format(today, 'yyyy-MM-01'), isActive: true },
  { id: 'b-software', name: 'SaaS & Subscriptions', amount: 8000, category: 'freelance_tools', period: 'monthly', startDate: format(today, 'yyyy-MM-01'), isActive: true },
  { id: 'b-investments', name: 'Monthly SIP Goal', amount: 20000, category: 'investments', period: 'monthly', startDate: format(today, 'yyyy-MM-01'), isActive: true },
];

// 5. Generate 80+ Realistic Expenses
const expenseTemplates = [
  { item: 'Whole Foods Fresh Market Organic Produce', cat: 'groceries', min: 1200, max: 3500, where: 'Nature Basket', pay: 'UPI', acc: 'SBI' },
  { item: 'Blue Tokai Specialty Pour-Over Coffee', cat: 'food', min: 280, max: 650, where: 'Blue Tokai Cafe', pay: 'UPI', acc: 'HDFC CC' },
  { item: 'Uber Premier Ride to Tech Park', cat: 'transportation', min: 350, max: 850, where: 'Uber Technologies', pay: 'UPI', acc: 'SBI' },
  { item: 'Fine Dining Weekend Dinner with Family', cat: 'food', min: 2200, max: 5800, where: 'Toit Brewpub', pay: 'Credit Card', acc: 'HDFC CC' },
  { item: 'Zara Linen Shirt & Chinos', cat: 'shopping', min: 3990, max: 8500, where: 'Zara Mall', pay: 'Credit Card', acc: 'HDFC CC' },
  { item: 'Swiggy Gourmet Dinner Delivery', cat: 'food', min: 450, max: 1200, where: 'Swiggy', pay: 'UPI', acc: 'SBI' },
  { item: 'Shell V-Power Premium Petrol Refuel', cat: 'transportation', min: 2500, max: 4500, where: 'Shell Gas Station', pay: 'Credit Card', acc: 'HDFC CC' },
  { item: 'Apollo Pharmacy Vitamins & Cold Relief', cat: 'health', min: 450, max: 1600, where: 'Apollo Pharmacy', pay: 'UPI', acc: 'SBI' },
  { item: 'Blinkit 10-min Emergency Grocery Haul', cat: 'groceries', min: 380, max: 1400, where: 'Blinkit Dark Store', pay: 'UPI', acc: 'SBI' },
  { item: 'PVR IMAX 3D Movie Tickets & Truffle Popcorn', cat: 'entertainment', min: 1400, max: 2800, where: 'PVR Cinemas', pay: 'Credit Card', acc: 'HDFC CC' },
  { item: 'Amazon Kindle E-Books & Hardcovers', cat: 'education', min: 599, max: 1800, where: 'Amazon.in', pay: 'UPI', acc: 'SBI' },
  { item: 'Artisan Sourdough Bakery Loaf & Croissants', cat: 'groceries', min: 320, max: 750, where: 'Sour House Bakery', pay: 'Cash', acc: 'Wallet' },
  { item: 'Figma Organization Annual Seat License', cat: 'freelance_tools', min: 3200, max: 3200, where: 'Figma.com', pay: 'Credit Card', acc: 'HDFC CC' },
  { item: 'Grooming & Hair Styling Salon Session', cat: 'shopping', min: 800, max: 2200, where: 'Toni & Guy', pay: 'UPI', acc: 'SBI' },
  { item: 'Veterinary Checkup & Premium Cat Food', cat: 'pets', min: 1500, max: 3400, where: 'Pet Sanctuary Clinic', pay: 'UPI', acc: 'SBI' },
  { item: 'Decathlon Resistance Bands & Workout Mat', cat: 'fitness', min: 899, max: 2400, where: 'Decathlon Sports', pay: 'UPI', acc: 'SBI' },
  { item: 'Flight Tickets Bangalore to Goa Weekend Trip', cat: 'travel', min: 7200, max: 12500, where: 'IndiGo Airlines', pay: 'Credit Card', acc: 'HDFC CC' },
  { item: 'Boutique Hotel Stay Booking in Goa', cat: 'travel', min: 9500, max: 18000, where: 'Airbnb / Taj', pay: 'Credit Card', acc: 'HDFC CC' },
  { item: 'Zomato Biryani & Kebabs Feast for Friends', cat: 'food', min: 980, max: 2400, where: 'Meghana Foods', pay: 'UPI', acc: 'SBI' },
  { item: 'Electricity Bill BESCOM Online Payment', cat: 'utilities', min: 1850, max: 3400, where: 'BESCOM Portal', pay: 'UPI', acc: 'SBI' },
];

const expenses: any[] = [];
for (let i = 0; i < 95; i++) {
  const t = expenseTemplates[i % expenseTemplates.length];
  const daysAgo = Math.floor(Math.random() * 45);
  const expDate = format(subDays(today, daysAgo), 'yyyy-MM-dd');
  const randomAmt = Math.floor(Math.random() * (t.max - t.min + 1)) + t.min;
  const hours = String(Math.floor(Math.random() * 14) + 9).padStart(2, '0');
  const mins = String(Math.floor(Math.random() * 60)).padStart(2, '0');

  expenses.push({
    id: `exp-${1000 + i}`,
    date: expDate,
    time: `${hours}:${mins}`,
    items: t.item,
    category: t.cat,
    amount: randomAmt,
    paymentMethod: t.pay,
    account: t.acc,
    where: t.where,
    note: `Sample verified transaction #${1000 + i}`,
    isRecurring: false,
    isTemplate: false,
    attachments: [],
    createdAt: new Date(subDays(today, daysAgo)).toISOString(),
    updatedAt: new Date(subDays(today, daysAgo)).toISOString(),
  });
}

// 6. Generate 25+ Realistic Dues & Receivables
const duesList = [
  { type: 'due', person: 'Rahul Mehta', amt: 2500, purpose: 'Dinner bill split at Toit Brewpub', status: 'pending', loc: 'Indiranagar', note: 'Will transfer via GPay before Friday' },
  { type: 'due', person: 'Suresh Electrician', amt: 1200, purpose: 'Living room chandelier & switchboard repair', status: 'pending', loc: 'Home', note: 'Pending physical inspection on Saturday' },
  { type: 'due', person: 'Karthik Raja', amt: 4500, purpose: 'Weekend Goa cab booking share', status: 'settled', loc: 'Goa Trip', note: 'Settled via UPI on Aug 12' },
  { type: 'due', person: 'Deepa Sharma', amt: 3500, purpose: 'Concert ticket booking advance', status: 'settled', loc: 'BookMyShow', note: 'Paid full share' },
  { type: 'due', person: 'Local Dry Cleaners', amt: 850, purpose: 'Winter blazer & silk curtain dry cleaning', status: 'pending', loc: 'Express Dry Clean', note: 'Pick up on Wednesday' },
  { type: 'receivable', person: 'Sneha Patel', amt: 6500, purpose: 'Share of Airbnb villa in Pondicherry', status: 'pending', loc: 'Pondicherry Trip', note: 'Promised to settle on month-end salary day' },
  { type: 'receivable', person: 'Arjun Rao', amt: 12000, purpose: 'MacBook Pro adapter & monitor loan advance', status: 'pending', loc: 'Tech Studio', note: 'Borrowing until project reimbursement' },
  { type: 'receivable', person: 'Pooja Hegde', amt: 1800, purpose: 'Lunch bill paid on behalf at Burma Burma', status: 'settled', loc: 'Burma Burma Cafe', note: 'Transferred instantly' },
  { type: 'receivable', person: 'Client: FinTech Labs', amt: 45000, purpose: 'Mobile Dashboard UI Prototype Milestone 2', status: 'pending', loc: 'Freelance Project', note: 'Invoice #2026-088 due net 15' },
  { type: 'receivable', person: 'Amitabh Sen', amt: 5000, purpose: 'Badminton court monthly advance booking', status: 'settled', loc: 'Playo Sports Arena', note: 'Settled on 1st of month' },
  { type: 'due', person: 'Dr. Alok Clinic', amt: 1500, purpose: 'Dental routine cleaning balance', status: 'pending', loc: 'Dental Clinic', note: 'Pay during follow-up session' },
  { type: 'receivable', person: 'Kavita Roy', amt: 3200, purpose: 'Zomato house party food order split', status: 'pending', loc: 'House Party', note: '4-way equal dinner split' },
  { type: 'due', person: 'Neighborhood Grocery Store', amt: 780, purpose: 'Khata ledger weekly milk & eggs dues', status: 'pending', loc: 'Corner Supermarket', note: 'Pay at weekend' },
  { type: 'receivable', person: 'Naveen Kumar', amt: 8500, purpose: 'Weekend camera lens rental collateral reimbursement', status: 'settled', loc: 'RentACam', note: 'Deposit returned safely' },
];

const debts: any[] = [];
duesList.forEach((d, idx) => {
  const daysAgo = Math.floor(Math.random() * 30);
  debts.push({
    id: idx + 1,
    type: d.type,
    personName: d.person,
    amount: d.amt,
    purpose: d.purpose,
    status: d.status,
    location: d.loc,
    notes: d.note,
    datetime: `${format(subDays(today, daysAgo), 'yyyy-MM-dd')}T14:30:00`,
    createdAt: new Date(subDays(today, daysAgo)).toISOString(),
  });
});

// JSON Backup Object
const fullJsonBackup = {
  version: '3.0',
  exportDate: new Date().toISOString(),
  appName: 'Pocket Ledger',
  settings: {
    id: 'default',
    currency: '₹',
    theme: 'system',
    language: 'en',
    notifications: true,
    budgetAlerts: true,
    notifyRoutinePrompts: true,
    notifyBudgetAlerts: true,
    notifyBudgetThreshold: 80,
    notifyRecurringReminders: true,
    notifyDueReminders: true,
    browserNotificationsEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    primaryColor: 'violet',
    fontFamily: 'jakarta',
    fontSize: 'standard',
    updatedAt: new Date().toISOString(),
  },
  categories,
  budgets,
  expenses,
  debts,
  recurringExpenses,
  recurringDebts,
};

// Write JSON Files
const jsonPath1 = path.resolve(process.cwd(), 'client/public/sample-backup-full.json');
const jsonPath2 = path.resolve(process.cwd(), 'client/public/test-data.json');
fs.writeFileSync(jsonPath1, JSON.stringify(fullJsonBackup, null, 2), 'utf8');
fs.writeFileSync(jsonPath2, JSON.stringify(fullJsonBackup, null, 2), 'utf8');
console.log(`✓ Generated JSON Backup at ${jsonPath1} (${expenses.length} expenses, ${recurringExpenses.length} recurring exp, ${recurringDebts.length} recurring dues, ${debts.length} dues, ${categories.length} categories)`);

// Generate Full Excel Workbook
async function generateExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Pocket Ledger Beta Generator';
  workbook.created = new Date();

  // 1. Categories Sheet
  const catSheet = workbook.addWorksheet('Categories');
  catSheet.columns = [
    { header: 'ID', key: 'id', width: 22 },
    { header: 'Name', key: 'name', width: 26 },
    { header: 'Icon', key: 'icon', width: 16 },
    { header: 'Color', key: 'color', width: 16 },
    { header: 'Is Default', key: 'isDefault', width: 14 },
  ];
  categories.forEach(c => {
    catSheet.addRow({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      isDefault: c.isDefault ? 'Yes' : 'No',
    });
  });

  // 2. Expenses Sheet
  const expSheet = workbook.addWorksheet('Expenses');
  expSheet.columns = [
    { header: 'ID', key: 'id', width: 28 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Time', key: 'time', width: 10 },
    { header: 'Item / Purpose', key: 'items', width: 34 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Payment Method', key: 'paymentMethod', width: 16 },
    { header: 'Account', key: 'account', width: 16 },
    { header: 'Location / Where', key: 'where', width: 22 },
    { header: 'Notes', key: 'note', width: 30 },
    { header: 'Is Recurring', key: 'isRecurring', width: 14 },
    { header: 'Recurring Rule ID', key: 'recurringRuleId', width: 28 },
  ];
  expenses.forEach(e => {
    expSheet.addRow({
      id: e.id,
      date: e.date,
      time: e.time,
      items: e.items,
      category: e.category,
      amount: e.amount,
      paymentMethod: e.paymentMethod,
      account: e.account,
      where: e.where || '',
      note: e.note || '',
      isRecurring: e.isRecurring ? 'Yes' : 'No',
      recurringRuleId: e.recurringRuleId || '',
    });
  });

  // 3. Dues & Receivables Sheet
  const debtSheet = workbook.addWorksheet('Dues & Receivables');
  debtSheet.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Type', key: 'type', width: 16 },
    { header: 'Person', key: 'personName', width: 24 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Purpose', key: 'purpose', width: 32 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Notes', key: 'notes', width: 32 },
    { header: 'Date & Time', key: 'datetime', width: 22 },
    { header: 'Recurring Rule ID', key: 'recurringRuleId', width: 28 },
  ];
  debts.forEach(d => {
    debtSheet.addRow({
      id: d.id,
      type: d.type === 'due' ? 'Due (To Pay)' : 'Receivable (To Get)',
      personName: d.personName,
      amount: d.amount,
      purpose: d.purpose,
      status: d.status === 'settled' ? 'Settled' : 'Pending',
      location: d.location || '',
      notes: d.notes || '',
      datetime: d.datetime,
      recurringRuleId: d.recurringRuleId || '',
    });
  });

  // 4. Recurring Expenses Sheet
  const recExpSheet = workbook.addWorksheet('Recurring Expenses');
  recExpSheet.columns = [
    { header: 'ID', key: 'id', width: 28 },
    { header: 'Item / Purpose', key: 'items', width: 32 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Frequency', key: 'frequency', width: 16 },
    { header: 'Interval Count', key: 'customIntervalCount', width: 14 },
    { header: 'Interval Unit', key: 'customIntervalUnit', width: 14 },
    { header: 'Payment Method', key: 'paymentMethod', width: 16 },
    { header: 'Account', key: 'account', width: 16 },
    { header: 'Start Date', key: 'startDate', width: 14 },
    { header: 'End Date', key: 'endDate', width: 14 },
    { header: 'Last Generated Date', key: 'lastGeneratedDate', width: 20 },
    { header: 'Location / Where', key: 'where', width: 20 },
    { header: 'Notes', key: 'note', width: 34 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  recurringExpenses.forEach(r => {
    recExpSheet.addRow({
      id: r.id,
      items: r.items,
      amount: r.amount,
      category: r.category,
      frequency: r.frequency,
      customIntervalCount: r.customIntervalCount || 1,
      customIntervalUnit: r.customIntervalUnit || 'months',
      paymentMethod: r.paymentMethod,
      account: r.account,
      startDate: r.startDate,
      endDate: r.endDate || '',
      lastGeneratedDate: r.lastGeneratedDate || '',
      where: r.where || '',
      note: r.note || '',
      status: r.isActive ? 'Active' : 'Paused',
    });
  });

  // 5. Recurring Dues Sheet
  const recDebtSheet = workbook.addWorksheet('Recurring Dues');
  recDebtSheet.columns = [
    { header: 'ID', key: 'id', width: 28 },
    { header: 'Type', key: 'type', width: 18 },
    { header: 'Person', key: 'personName', width: 26 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Purpose', key: 'purpose', width: 34 },
    { header: 'Frequency', key: 'frequency', width: 16 },
    { header: 'Interval Count', key: 'customIntervalCount', width: 14 },
    { header: 'Interval Unit', key: 'customIntervalUnit', width: 14 },
    { header: 'Start Date', key: 'startDate', width: 14 },
    { header: 'End Date', key: 'endDate', width: 14 },
    { header: 'Last Generated Date', key: 'lastGeneratedDate', width: 20 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Notes', key: 'notes', width: 34 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  recurringDebts.forEach(r => {
    recDebtSheet.addRow({
      id: r.id,
      type: r.type === 'due' ? 'Due (To Pay)' : 'Receivable (To Get)',
      personName: r.personName,
      amount: r.amount,
      purpose: r.purpose,
      frequency: r.frequency,
      customIntervalCount: r.customIntervalCount || 1,
      customIntervalUnit: r.customIntervalUnit || 'months',
      startDate: r.startDate,
      endDate: r.endDate || '',
      lastGeneratedDate: r.lastGeneratedDate || '',
      location: r.location || '',
      notes: r.notes || '',
      status: r.isActive ? 'Active' : 'Paused',
    });
  });

  // 6. Budgets Sheet
  const budgetSheet = workbook.addWorksheet('Budgets');
  budgetSheet.columns = [
    { header: 'ID', key: 'id', width: 22 },
    { header: 'Name', key: 'name', width: 26 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Period', key: 'period', width: 14 },
    { header: 'Start Date', key: 'startDate', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  budgets.forEach(b => {
    budgetSheet.addRow({
      id: b.id,
      name: b.name,
      amount: b.amount,
      category: b.category,
      period: b.period,
      startDate: b.startDate,
      status: b.isActive ? 'Active' : 'Paused',
    });
  });

  // Style header row of each sheet for premium appearance
  [catSheet, expSheet, debtSheet, recExpSheet, recDebtSheet, budgetSheet].forEach(sheet => {
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' } // Indigo accent header
    };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const xlsxPath = path.resolve(process.cwd(), 'client/public/sample-backup-full.xlsx');
  await workbook.xlsx.writeFile(xlsxPath);
  console.log(`✓ Generated Excel Workbook at ${xlsxPath}`);
}

generateExcel().catch(err => {
  console.error('Error generating Excel file:', err);
});
