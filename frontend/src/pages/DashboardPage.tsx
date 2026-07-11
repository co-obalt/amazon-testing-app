import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { API_BASE } from '../config';
import { 
  Menu,
  X,
  LayoutDashboard,
  Layers,
  FileText,
  ClipboardCheck,
  User,
  Wallet,
  Users,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
  Lock,
  Unlock,
  Copy,
  ArrowRight,
  ArrowUpRight,
  ShieldAlert,
  RefreshCw,
  LogOut,
  Check,
  Bell,
  BellRing,
  Settings,
  HelpCircle,
  Info,
  Download,
  Search,
  Filter,
  Globe,
  QrCode,
  Share2,
  Smartphone,
  TrendingUp,
  Plus,
  Home,
  MessageSquare,
  Send,
  Paperclip
} from 'lucide-react';
import { Product } from '../types';

interface OrderRecord {
  id: string;
  productTitle: string;
  orderId?: string;
  payout: number;
  status: 'Completed' | 'Pending';
  date: string;
  reviewText?: string;
}

interface PlatformStats {
  walletBalance: number;
  completedOrders: number;
  pendingReviews: number;
  profitEarned: number;
  orders: OrderRecord[];
}

interface DashboardPageProps {
  username: string;
  products: Product[];
  onLogout: () => void;
  showToast: (msg: string) => void;
}

// Fixed assigned products satisfying the strict $0.50 to $2.50 payout requirement
interface AssignedProduct {
  id: string;
  title: string;
  category: string;
  image: string;
  payout: number;
  difficulty: 'Easy' | 'Medium' | 'Expert';
  wordLimit: number;
  externalLink: string;
}

const ASSIGNED_PRODUCTS: Record<'Amazon' | 'Alibaba' | 'Shopify', AssignedProduct[]> = {
  Amazon: [
    { id: "asg-amz-1", title: "ZonHub Smart Echo (5th Gen) | Spatial sound", category: "Smart Home", image: "https://images.unsplash.com/photo-1543512214-318c7553f230?auto=format&fit=crop&q=80&w=600", payout: 1.25, difficulty: "Easy", wordLimit: 30, externalLink: "https://www.amazon.com/s?k=smart+echo+speaker" },
    { id: "asg-amz-2", title: "ZonReader Paperwhite (16 GB) | Warm light", category: "Electronics", image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=600", payout: 1.95, difficulty: "Medium", wordLimit: 45, externalLink: "https://www.amazon.com/s?k=paperwhite+ereader" },
    { id: "asg-amz-3", title: "Organic Bamboo Coasters Set (6-Pack) | Non-slip", category: "Kitchen & Home", image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&q=80&w=600", payout: 0.80, difficulty: "Easy", wordLimit: 20, externalLink: "https://www.amazon.com/s?k=bamboo+coasters" },
    { id: "asg-amz-4", title: "Ergonomic Memory Foam Office Seat Cushion", category: "Office Products", image: "https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=600", payout: 1.10, difficulty: "Easy", wordLimit: 25, externalLink: "https://www.amazon.com/s?k=office+seat+cushion" },
    { id: "asg-amz-5", title: "Stainless Steel Vacuum Insulated Water Bottle (32oz)", category: "Sports & Outdoors", image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=600", payout: 1.40, difficulty: "Easy", wordLimit: 30, externalLink: "https://www.amazon.com/s?k=insulated+water+bottle" },
    { id: "asg-amz-6", title: "Professional Ceramic Ionic Hair Dryer | 1875W", category: "Personal Care", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=600", payout: 2.20, difficulty: "Expert", wordLimit: 50, externalLink: "https://www.amazon.com/s?k=hair+dryer" },
    { id: "asg-amz-7", title: "Adjustable Laptop Stand | Ergonomic Aluminum Stand", category: "Office Products", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=600", payout: 1.65, difficulty: "Medium", wordLimit: 40, externalLink: "https://www.amazon.com/s?k=laptop+stand" },
    { id: "asg-amz-8", title: "Premium Matcha Green Tea Powder (Organic)", category: "Grocery & Gourmet", image: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=600", payout: 0.95, difficulty: "Easy", wordLimit: 25, externalLink: "https://www.amazon.com/s?k=matcha+powder" },
    { id: "asg-amz-9", title: "Dual-Port USB-C Wall Charger Block | 40W Fast Charger", category: "Electronics", image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&q=80&w=600", payout: 1.05, difficulty: "Easy", wordLimit: 20, externalLink: "https://www.amazon.com/s?k=usb+c+charger" },
    { id: "asg-amz-10", title: "Wireless Active Noise Cancelling Earbuds | Bluetooth 5.3", category: "Electronics", image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=600", payout: 2.10, difficulty: "Expert", wordLimit: 45, externalLink: "https://www.amazon.com/s?k=noise+cancelling+earbuds" },
    { id: "asg-amz-11", title: "Digital Kitchen Scale | High Precision Multi-unit", category: "Kitchen & Home", image: "https://images.unsplash.com/photo-1588675646184-f550218b57b5?auto=format&fit=crop&q=80&w=600", payout: 0.75, difficulty: "Easy", wordLimit: 20, externalLink: "https://www.amazon.com/s?k=kitchen+scale" },
    { id: "asg-amz-12", title: "Aromatherapy Ceramic Essential Oil Diffuser (500ml)", category: "Smart Home", image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600", payout: 1.30, difficulty: "Medium", wordLimit: 30, externalLink: "https://www.amazon.com/s?k=essential+oil+diffuser" }
  ],
  Alibaba: [
    { id: "asg-ali-1", title: "AliUltra Foldable Electric Scooter | Dual motor", category: "Transportation", image: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&q=80&w=600", payout: 2.50, difficulty: "Expert", wordLimit: 50, externalLink: "https://www.alibaba.com/trade/search?SearchText=electric+scooter" },
    { id: "asg-ali-2", title: "AliVision 4K Native LED Projector | 15k Lms", category: "Entertainment", image: "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&q=80&w=600", payout: 2.15, difficulty: "Medium", wordLimit: 40, externalLink: "https://www.alibaba.com/trade/search?SearchText=4k+projector" },
    { id: "asg-ali-3", title: "AliSecure HD Outdoor IP Camera | Wifi PTZ Node", category: "Security", image: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&q=80&w=600", payout: 1.80, difficulty: "Medium", wordLimit: 35, externalLink: "https://www.alibaba.com/trade/search?SearchText=wifi+ip+camera" },
    { id: "asg-ali-4", title: "Smart Automated Robot Vacuum Cleaner | LIDAR Map", category: "Smart Home", image: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=600", payout: 2.40, difficulty: "Expert", wordLimit: 50, externalLink: "https://www.alibaba.com/trade/search?SearchText=robot+vacuum" },
    { id: "asg-ali-5", title: "Portable Solar Generator Station | 500Wh Output", category: "Electronics", image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=600", payout: 2.30, difficulty: "Expert", wordLimit: 45, externalLink: "https://www.alibaba.com/trade/search?SearchText=portable+solar+generator" },
    { id: "asg-ali-6", title: "Heavy Duty Massage Gun | 30 Speeds Deep Tissue", category: "Personal Care", image: "https://images.unsplash.com/photo-1607962837359-5e7eaf562642?auto=format&fit=crop&q=80&w=600", payout: 1.60, difficulty: "Medium", wordLimit: 30, externalLink: "https://www.alibaba.com/trade/search?SearchText=massage+gun" },
    { id: "asg-ali-7", title: "Adjustable Dumbbells Set (50lbs) | Quick Dial", category: "Sports & Outdoors", image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600", payout: 2.25, difficulty: "Expert", wordLimit: 40, externalLink: "https://www.alibaba.com/trade/search?SearchText=adjustable+dumbbells" },
    { id: "asg-ali-8", title: "Automatic Espresso Coffee Machine | 20 Bar Pump", category: "Kitchen & Home", image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=600", payout: 2.45, difficulty: "Expert", wordLimit: 50, externalLink: "https://www.alibaba.com/trade/search?SearchText=espresso+machine" },
    { id: "asg-ali-9", title: "Electric Oral Irrigator Dental Flosser | 4 Modes", category: "Personal Care", image: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=600", payout: 0.95, difficulty: "Easy", wordLimit: 25, externalLink: "https://www.alibaba.com/trade/search?SearchText=oral+irrigator" },
    { id: "asg-ali-10", title: "Portable Bluetooth Thermal Label Printer", category: "Office Products", image: "https://images.unsplash.com/photo-1543269664-76bc3997d9ea?auto=format&fit=crop&q=80&w=600", payout: 1.20, difficulty: "Easy", wordLimit: 30, externalLink: "https://www.alibaba.com/trade/search?SearchText=label+printer" },
    { id: "asg-ali-11", title: "Dual Layer Car Roof Cargo Carrier Bag | Waterproof", category: "Transportation", image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600", payout: 1.50, difficulty: "Medium", wordLimit: 35, externalLink: "https://www.alibaba.com/trade/search?SearchText=roof+cargo+bag" },
    { id: "asg-ali-12", title: "Foldable Lightbox Photography Studio Kit", category: "Entertainment", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600", payout: 1.45, difficulty: "Medium", wordLimit: 30, externalLink: "https://www.alibaba.com/trade/search?SearchText=lightbox+studio" }
  ],
  Shopify: [
    { id: "asg-shp-1", title: "Minimalist Full-Grain Leather Wallet | RFID organizer", category: "Apparel & Accessories", image: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&q=80&w=600", payout: 1.10, difficulty: "Easy", wordLimit: 25, externalLink: "https://www.google.com/search?q=minimalist+leather+wallet" },
    { id: "asg-shp-2", title: "Therapeutic Essential Oils Diffuser | Ceramic ultrasonic", category: "Wellness & Spa", image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600", payout: 0.90, difficulty: "Easy", wordLimit: 25, externalLink: "https://www.google.com/search?q=ceramic+essential+oils+diffuser" },
    { id: "asg-shp-3", title: "Eco-Friendly Cork Yoga Mat | Non-slip sweat-resistant", category: "Wellness & Spa", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600", payout: 1.70, difficulty: "Medium", wordLimit: 35, externalLink: "https://www.google.com/search?q=cork+yoga+mat" },
    { id: "asg-shp-4", title: "Hydro Flask Insulated Travel Coffee Mug | 16oz Wide Mouth", category: "Apparel & Accessories", image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600", payout: 1.20, difficulty: "Easy", wordLimit: 20, externalLink: "https://www.google.com/search?q=insulated+travel+mug" },
    { id: "asg-shp-5", title: "Premium Bamboo Bed Sheets Set | King Size Cooling", category: "Wellness & Spa", image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600", payout: 2.35, difficulty: "Expert", wordLimit: 50, externalLink: "https://www.google.com/search?q=bamboo+bed+sheets" },
    { id: "asg-shp-6", title: "Minimalist Wooden Desk Organizer Stand | Handcrafted Walnut", category: "Apparel & Accessories", image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=600", payout: 1.50, difficulty: "Medium", wordLimit: 30, externalLink: "https://www.google.com/search?q=wooden+desk+organizer" },
    { id: "asg-shp-7", title: "Aromatherapy Soy Wax Candles Set | Lavender & Eucalyptus", category: "Wellness & Spa", image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=600", payout: 0.85, difficulty: "Easy", wordLimit: 20, externalLink: "https://www.google.com/search?q=soy+wax+candles" },
    { id: "asg-shp-8", title: "Polarized Retro Round Sunglasses | UV400 Unbreakable", category: "Apparel & Accessories", image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=600", payout: 1.30, difficulty: "Medium", wordLimit: 30, externalLink: "https://www.google.com/search?q=polarized+round+sunglasses" },
    { id: "asg-shp-9", title: "Manual Ceramic Burr Coffee Grinder | Adjustable Coarseness", category: "Wellness & Spa", image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=600", payout: 1.45, difficulty: "Easy", wordLimit: 25, externalLink: "https://www.google.com/search?q=manual+coffee+grinder" },
    { id: "asg-shp-10", title: "Stainless Steel French Press Coffee Maker | Double Wall", category: "Wellness & Spa", image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=600", payout: 1.90, difficulty: "Expert", wordLimit: 40, externalLink: "https://www.google.com/search?q=french+press+coffee+maker" },
    { id: "asg-shp-11", title: "Vegan Leather Minimalist Backpack | 15.6 Inch Laptop Sleeve", category: "Apparel & Accessories", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600", payout: 2.10, difficulty: "Expert", wordLimit: 45, externalLink: "https://www.google.com/search?q=vegan+leather+backpack" },
    { id: "asg-shp-12", title: "Ergonomic Balance Ball Chair with Stability Base", category: "Wellness & Spa", image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=600", payout: 2.25, difficulty: "Expert", wordLimit: 45, externalLink: "https://www.google.com/search?q=balance+ball+chair" }
  ]
};

export const AVATARS = [
  { 
    gradient: 'from-indigo-500 to-purple-600', 
    name: 'Professional Reviewer', 
    icon: (className = "h-12 w-12") => (
      <svg className={`${className} text-white`} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.75 16.65c0-1.84 1.25-3.41 3.03-3.79a9.78 9.78 0 0110.44 0c1.78.38 3.03 1.95 3.03 3.79a.75.75 0 01-.75.75H4.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
      </svg>
    )
  },
  { 
    gradient: 'from-amber-500 to-orange-600', 
    name: 'VIP Node Evaluator', 
    icon: (className = "h-12 w-12") => (
      <svg className={`${className} text-white`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a5 5 0 100 10 5 5 0 000-10zM12 14a8 8 0 00-8 8h16a8 8 0 00-8-8z" />
      </svg>
    )
  },
  { 
    gradient: 'from-emerald-500 to-teal-650', 
    name: 'Secure Trust Auditor', 
    icon: (className = "h-12 w-12") => (
      <svg className={`${className} text-white`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  },
  { 
    gradient: 'from-rose-500 to-pink-650', 
    name: 'Elite Star Reviewer', 
    icon: (className = "h-12 w-12") => (
      <svg className={`${className} text-white`} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12c0 2.761 1.147 5.253 3.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
      </svg>
    )
  },
  { 
    gradient: 'from-blue-500 to-cyan-600', 
    name: 'E-Commerce Analyst', 
    icon: (className = "h-12 w-12") => (
      <svg className={`${className} text-white`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    )
  },
  { 
    gradient: 'from-gray-700 to-gray-900', 
    name: 'Enterprise Reviewer', 
    icon: (className = "h-12 w-12") => (
      <svg className={`${className} text-white`} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 18.75a.75.75 0 00.75-.75 6.75 6.75 0 00-13.5 0 .75.75 0 00.75.75h12z" clipRule="evenodd" />
      </svg>
    )
  }
];

export default function DashboardPage({
  username,
  onLogout,
  showToast,
}: DashboardPageProps) {
  // Deposits History
  interface DepositRequest {
    id: string;
    protocol: 'TRC-20' | 'ERC-20' | 'BTC';
    amount: number;
    cryptoAmount?: number;
    currency?: string;
    txHash: string;
    remark?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    date: string;
    platform: 'Amazon' | 'Alibaba' | 'Shopify';
  }

  // Navigation & Layout states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'deposit' | 'orders' | 'record' | 'profile' | 'invitation' | 'customer-service' | 'terms' | 'about-us' | 'faq'>('home');
  const [activePlatform, setActivePlatform] = useState<'Amazon' | 'Alibaba' | 'Shopify' | null>(null);
  const [enabledPlatform, setEnabledPlatform] = useState<'Amazon' | 'Alibaba' | 'Shopify' | null>(null);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);

  // Deposit Request and VIP Unlock States
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<'TRC-20' | 'ERC-20' | 'BTC'>('TRC-20');
  const [depositTargetPlatform, setDepositTargetPlatform] = useState<'Amazon' | 'Alibaba' | 'Shopify'>('Amazon');
  const [newDepositAmount, setNewDepositAmount] = useState('');
  const [newDepositTxHash, setNewDepositTxHash] = useState('');
  const [newDepositRemark, setNewDepositRemark] = useState('');
  const [unlockedVIPs, setUnlockedVIPs] = useState<Record<'Amazon' | 'Alibaba' | 'Shopify', boolean>>({
    Amazon: true,
    Alibaba: false,
    Shopify: false,
  });

  // Real-time refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Never synced');

  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Welcome to Amazon Vine Portal!", type: "bonus", status: "unread", date: "Jul 10, 2026" },
  ]);

  // Gigs Search and Filters
  const [gigsSearch, setGigsSearch] = useState('');
  const [gigsDifficulty, setGigsDifficulty] = useState<'All' | 'Easy' | 'Medium' | 'Expert'>('All');
  const [gigsPage, setGigsPage] = useState(1);

  // Orders Filter and Search
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<'All' | 'Completed' | 'Pending' | 'Failed'>('All');
  const [ordersDateFilter, setOrdersDateFilter] = useState<'All' | 'Last 7 days' | 'This month'>('All');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderRecord | null>(null);

  // Recent Deposits & Withdrawals for Profile
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // Edit Profile States
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [profileActiveSection, setProfileActiveSection] = useState<'details' | 'wallet' | 'security'>('details');
  const [profileEmail, setProfileEmail] = useState(username.toLowerCase().replace(/\s+/g, '') + '@gmail.com');
  const [profilePhone, setProfilePhone] = useState('+1 (555) 019-2831');
  const [profilePassword, setProfilePassword] = useState('password123');
  const [referralCode, setReferralCode] = useState('');
  const [withdrawalPassword, setWithdrawalPassword] = useState('1234');
  const [enable2FA, setEnable2FA] = useState(false);

  // Profile forms password update states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldWithdrawalPassword, setOldWithdrawalPassword] = useState('');
  const [newWithdrawalPassword, setNewWithdrawalPassword] = useState('');
  const [confirmWithdrawalPassword, setConfirmWithdrawalPassword] = useState('');

  // Customer Support Live Chat Box States
  const [chatMessages, setChatMessages] = useState<Array<{id: string, sender: 'user' | 'support', text: string, time: string}>>(() => {
    const savedChat = sessionStorage.getItem('support_chat_history');
    if (savedChat) {
      try {
        return JSON.parse(savedChat);
      } catch (e) {
        // Fallback to default message
      }
    }
    return [
      { 
        id: 'msg-init-1', 
        sender: 'support', 
        text: 'Hello! Welcome to the Amazon E-Commerce Hub Support Desk. How can we assist you with your account settings, deposits, or evaluations today?', 
        time: '10:00 AM' 
      }
    ];
  });
  const [chatInputText, setChatInputText] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);

  const fetchAllData = async () => {
    const token = localStorage.getItem('reviewer_auth_token');
    if (!token) {
      onLogout();
      return;
    }

    try {
      // 1. Fetch User details, balances, and system settings configurations
      const userRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!userRes.ok) {
        onLogout();
        return;
      }
      const userData = await userRes.json();

      // Update balances state
      if (userData.balances) {
        setPlatformsData({
          Amazon: {
            walletBalance: userData.balances.Amazon.walletBalance,
            completedOrders: userData.balances.Amazon.completedReviewsCount,
            pendingReviews: 0,
            profitEarned: Number((userData.balances.Amazon.completedReviewsCount * 1.5).toFixed(2)),
            orders: []
          },
          Alibaba: {
            walletBalance: userData.balances.Alibaba.walletBalance,
            completedOrders: userData.balances.Alibaba.completedReviewsCount,
            pendingReviews: 0,
            profitEarned: Number((userData.balances.Alibaba.completedReviewsCount * 1.5).toFixed(2)),
            orders: []
          },
          Shopify: {
            walletBalance: userData.balances.Shopify.walletBalance,
            completedOrders: userData.balances.Shopify.completedReviewsCount,
            pendingReviews: 0,
            profitEarned: Number((userData.balances.Shopify.completedReviewsCount * 1.5).toFixed(2)),
            orders: []
          }
        });

        // Resolve workspace locks dynamically
        const amzActive = userData.balances.Amazon.walletBalance > 0 || userData.balances.Amazon.completedReviewsCount > 0;
        const aliActive = userData.balances.Alibaba.walletBalance > 0 || userData.balances.Alibaba.completedReviewsCount > 0;
        const shoActive = userData.balances.Shopify.walletBalance > 0 || userData.balances.Shopify.completedReviewsCount > 0;

        if (amzActive) {
          setEnabledPlatform('Amazon');
          if (!activePlatform) setActivePlatform('Amazon');
        } else if (aliActive) {
          setEnabledPlatform('Alibaba');
          if (!activePlatform) setActivePlatform('Alibaba');
        } else if (shoActive) {
          setEnabledPlatform('Shopify');
          if (!activePlatform) setActivePlatform('Shopify');
        }
      }

      // Update bound wallet address mapping state
      if (userData.boundUsdtAddress) {
        setDefaultWalletAddress(userData.boundUsdtAddress);
        setWithdrawAddress(userData.boundUsdtAddress);
        setIsAddressBound(true);
      } else {
        setIsAddressBound(false);
      }

      // Update dynamic configuration wallets and links
      if (userData.systemConfig) {
        setDepositAddresses({
          'TRC-20': userData.systemConfig.trc20_address || 'TTisWCo1GTszkukUB6gmmdPRaXYsBATJKM',
          'ERC-20': userData.systemConfig.erc20_address || '0xde833b4707431ffa4fcd62da08219172a8360d95',
          'BTC': userData.systemConfig.btc_address || 'bc1q5kt8tzmkvk52xr6ty0n55v5lc0nahwv6xpu8zs'
        });
        if (userData.systemConfig.telegram_link) {
          setTelegramSupportLink(userData.systemConfig.telegram_link);
        }
        if (userData.referralCode) {
          setReferralCode(userData.referralCode);
        }
      }

      // 2. Fetch transaction logs (Deposits & Withdrawals)
      const historyRes = await fetch(`${API_BASE}/transactions/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const deps = historyData.filter((x: any) => x.type === 'Deposit');
        const withs = historyData.filter((x: any) => x.type === 'Withdrawal');
        setDepositRequests(deps.map((dep: any) => ({
          id: dep.id,
          protocol: dep.protocol || 'TRC-20',
          amount: parseFloat(dep.amount) || 0,
          cryptoAmount: dep.cryptoAmount ?? dep.crypto_amount ?? (parseFloat(dep.amount) || 0),
          currency: dep.currency || (dep.protocol === 'BTC' ? 'BTC' : 'USDT'),
          txHash: dep.txHash || dep.tx_hash || '',
          remark: dep.remark,
          status: dep.status || 'Pending',
          date: dep.date || new Date(dep.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          platform: dep.platform || 'Amazon'
        })));
        setDeposits(deps);
        setWithdrawals(withs);
      }

      // 3. Fetch review submissions history to merge in platform logs
      const subsRes = await fetch(`${API_BASE}/reviews/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setPlatformsData(prev => {
          const amzOrders = subsData.filter((x: any) => x.platform === 'Amazon');
          const aliOrders = subsData.filter((x: any) => x.platform === 'Alibaba');
          const shoOrders = subsData.filter((x: any) => x.platform === 'Shopify');

          return {
            Amazon: { ...prev.Amazon, orders: amzOrders, pendingReviews: amzOrders.filter((o: any) => o.status === 'Pending').length },
            Alibaba: { ...prev.Alibaba, orders: aliOrders, pendingReviews: aliOrders.filter((o: any) => o.status === 'Pending').length },
            Shopify: { ...prev.Shopify, orders: shoOrders, pendingReviews: shoOrders.filter((o: any) => o.status === 'Pending').length }
          };
        });
      }

      // 4. Fetch chat logs
      const chatRes = await fetch(`${API_BASE}/chat/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        setChatMessages(chatData);
      }

      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn("Active session data sync error:", err);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 60000); // Low-frequency fallback poll
    return () => clearInterval(interval);
  }, [activePlatform]);

  useEffect(() => {
    const token = localStorage.getItem('reviewer_auth_token');
    if (!token) return;

    // Dynamically calculate WS endpoint from REST API base
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = API_BASE.includes('localhost') 
      ? 'localhost:5000' 
      : window.location.host;
    
    const wsUrl = `${wsProto}//${wsHost}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'balance_update' || message.type === 'approval_notice') {
          fetchAllData();
          showToast(`⚡ Real-time updates synchronized successfully.`);
        }
      } catch (err) {
        console.error("Error handling real-time socket packet:", err);
      }
    };

    ws.onerror = (err) => {
      console.warn("Real-time WebSocket connection error:", err);
    };

    return () => {
      ws.close();
    };
  }, [activePlatform]);

  useEffect(() => {
    if (!activePlatform) {
      setAssignedProducts([]);
      return;
    }

    const token = localStorage.getItem('reviewer_auth_token');
    if (!token) return;

    fetch(`${API_BASE}/reviews/products?platform=${activePlatform}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAssignedProducts(data.map((p: any) => ({
            id: p.id,
            title: p.title,
            category: p.category,
            image: p.image_url,
            payout: parseFloat(p.payout),
            difficulty: p.difficulty,
            wordLimit: p.word_limit,
            externalLink: p.external_link
          })));
        } else {
          setAssignedProducts([]);
        }
      })
      .catch(() => {
        setAssignedProducts([]);
      });
  }, [activePlatform]);

  // Settings States
  const [settingsUsername, setSettingsUsername] = useState(username);
  const [settingsEmail, setSettingsEmail] = useState(username.toLowerCase().replace(/\s+/g, '') + '@gmail.com');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [emailNotifToggle, setEmailNotifToggle] = useState(true);
  const [telegramNotifToggle, setTelegramNotifToggle] = useState(false);
  const [browserNotifToggle, setBrowserNotifToggle] = useState(true);
  const [defaultWalletAddress, setDefaultWalletAddress] = useState('');
  const [isAddressBound, setIsAddressBound] = useState(false);
  const [defaultNetwork, setDefaultNetwork] = useState('TRC-20');
  const [settingsLanguage, setSettingsLanguage] = useState('English');
  const [settingsTimezone, setSettingsTimezone] = useState('UTC+5');

  // Combo system warning modal states
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [comboModalDetails, setComboModalDetails] = useState<{
    triggerBalance: number;
    currentBalance: number;
    requiredDeposit: number;
    position: number;
  } | null>(null);

  // Interactive settings and help tabs states
  const [settingsSubTab, setSettingsSubTab] = useState<'account' | 'notifications' | 'wallet' | 'danger'>('account');
  const [faqSearch, setFaqSearch] = useState('');
  const [activeFaqId, setActiveFaqId] = useState<number | null>(null);

  // Referral lists
  const referralLeaderboard = [
    { rank: "🥇", username: "user_abc", count: 15 },
    { rank: "🥈", username: "user_xyz", count: 12 },
    { rank: "🥉", username: "user_def", count: 8 },
  ];

  const referralHistory = [
    { name: "John Doe", date: "Jul 09, 2026", status: "Active", bonus: 1.50 },
    { name: "Jane Smith", date: "Jul 07, 2026", status: "Pending", bonus: 0.00 },
  ];

  // Separated balances/orders per platform so they NEVER mix. Starting with 0 balance for network lock flow
  const [platformsData, setPlatformsData] = useState<Record<'Amazon' | 'Alibaba' | 'Shopify', PlatformStats>>({
    Amazon: {
      walletBalance: 0.00,
      completedOrders: 0,
      pendingReviews: 0,
      profitEarned: 0.00,
      orders: []
    },
    Alibaba: {
      walletBalance: 0.00,
      completedOrders: 0,
      pendingReviews: 0,
      profitEarned: 0.00,
      orders: []
    },
    Shopify: {
      walletBalance: 0.00,
      completedOrders: 0,
      pendingReviews: 0,
      profitEarned: 0.00,
      orders: []
    }
  });

  // Review step-by-step wizard state
  const [activeReviewProduct, setActiveReviewProduct] = useState<AssignedProduct | null>(null);
  const [reviewStep, setReviewStep] = useState<1 | 2 | 3 | 4>(1);
  const [inputOrderId, setInputOrderId] = useState('');
  const [reviewDraftText, setReviewDraftText] = useState('');
  const [reviewStars, setReviewStars] = useState(5);

  // Profile details
  const [cryptoNetwork, setCryptoNetwork] = useState('TRC-20');
  const [depositAddresses, setDepositAddresses] = useState<Record<string, string>>({
    'TRC-20': 'TTisWCo1GTszkukUB6gmmdPRaXYsBATJKM',
    'ERC-20': '0xde833b4707431ffa4fcd62da08219172a8360d95',
    'BTC': 'bc1q5kt8tzmkvk52xr6ty0n55v5lc0nahwv6xpu8zs'
  });
  const [telegramSupportLink, setTelegramSupportLink] = useState('https://t.me/Customerservicecentre01');
  const [assignedProducts, setAssignedProducts] = useState<AssignedProduct[]>([]);

  // Withdraw request modal (only relevant when they click Withdraw, although locked unless 25+ orders)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');

  const currentPlatformData = activePlatform 
    ? platformsData[activePlatform] 
    : { walletBalance: 0, completedOrders: 0, pendingReviews: 0, profitEarned: 0, orders: [] };

  // Helper to copy text to clipboard
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  // Handle active category selection
  const handleSelectPlatform = (platform: 'Amazon' | 'Alibaba' | 'Shopify') => {
    if (enabledPlatform && enabledPlatform !== platform) {
      showToast(`Workspace locked to ${enabledPlatform}. You cannot switch to another network.`);
      return;
    }
    setActivePlatform(platform);
    showToast(`Switched workspace to ${platform}. loaded corresponding tasks.`);
  };

  // Real-time synchronization
  const handleRefreshBalance = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      const now = new Date().toLocaleTimeString();
      setLastRefreshed(now);
      showToast(`Real-time balances synchronized successfully with decentralized ledger nodes!`);
    }, 850);
  };

  // Export orders to CSV
  const handleDownloadCSV = () => {
    const headers = ["Order Record ID", "Merchant Item", "Order ID Ref", "Payout Amount", "Status", "Date", "Feedback Review"];
    const rows = currentPlatformData.orders.map(o => [
      o.id,
      `"${o.productTitle.replace(/"/g, '""')}"`,
      o.orderId || "N/A",
      o.payout.toFixed(2),
      o.status,
      o.date,
      `"${(o.reviewText || '').replace(/"/g, '""')}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zonreview_${activePlatform.toLowerCase()}_earnings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Successfully exported ${activePlatform} compliance ledger to CSV!`);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPassword !== profilePassword) {
      showToast("Error: Current login password does not match.");
      return;
    }
    if (newPassword.length < 8) {
      showToast("Error: New login password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Error: Confirm password does not match new password.");
      return;
    }
    setProfilePassword(newPassword);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast("✓ Login security password changed successfully.");
  };

  const handleChangeWithdrawalPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (oldWithdrawalPassword !== withdrawalPassword) {
      showToast("Error: Current withdrawal security password does not match.");
      return;
    }
    if (newWithdrawalPassword.length < 4) {
      showToast("Error: New withdrawal security password must be at least 4 characters.");
      return;
    }
    if (newWithdrawalPassword !== confirmWithdrawalPassword) {
      showToast("Error: Confirm withdrawal password does not match new withdrawal password.");
      return;
    }
    setWithdrawalPassword(newWithdrawalPassword);
    setOldWithdrawalPassword('');
    setNewWithdrawalPassword('');
    setConfirmWithdrawalPassword('');
    showToast("✓ Withdrawal security password changed successfully.");
  };

  const triggerUserImageAttach = () => {
    document.getElementById('userImageAttachInput')?.click();
  };

  const handleUserImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("File is too large. Please select an image under 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result as string;
      try {
        showToast("Uploading attachment screenshot...");
        const token = localStorage.getItem('reviewer_auth_token');
        const res = await fetch(`${API_BASE}/chat/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ image: base64 })
        });
        const data = await res.json();

        if (res.ok) {
          const optMsg = {
            id: `msg-opt-${Date.now()}`,
            sender: 'user' as const,
            text: data.imageUrl,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setChatMessages(prev => [...prev, optMsg]);

          const sendRes = await fetch(`${API_BASE}/chat/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              text: data.imageUrl,
              time: optMsg.time
            })
          });
          if (sendRes.ok) {
            showToast("✓ Image uploaded successfully!");
            const chatRes = await fetch(`${API_BASE}/chat/history`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (chatRes.ok) {
              const chatData = await chatRes.json();
              setChatMessages(chatData);
            }
          }
        } else {
          showToast(data.error || "Failed to upload image.");
        }
      } catch (err) {
        showToast("Image upload server connection error.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;

    const userMsgText = chatInputText;
    setChatInputText('');

    const timeVal = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const optMsg = {
      id: `msg-opt-${Date.now()}`,
      sender: 'user' as const,
      text: userMsgText,
      time: timeVal
    };
    setChatMessages(prev => [...prev, optMsg]);

    try {
      const token = localStorage.getItem('reviewer_auth_token');
      const res = await fetch(`${API_BASE}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: userMsgText,
          time: timeVal
        })
      });

      if (res.ok) {
        const chatRes = await fetch(`${API_BASE}/chat/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          setChatMessages(chatData);
        }
      } else {
        showToast("Failed to transmit support message.");
      }
    } catch (err) {
      showToast("Support message transmission network error.");
    }
  };

  // Notification actions
  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
    showToast("All notifications marked as read.");
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    showToast("Cleared all notifications.");
  };

  const markNotificationRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
  };

  // Progress tracker functions
  const startReviewFlow = (product: AssignedProduct) => {
    setActiveReviewProduct(product);
    setReviewStep(1);
    setInputOrderId('');
    setReviewDraftText('');
    setReviewStars(5);
  };

  const handleStep1Complete = () => {
    setReviewStep(2);
    showToast("Product acquisition registered. Please submit your Order ID.");
  };

  const handleStep2Complete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputOrderId.trim()) {
      showToast("Please enter a valid Order ID.");
      return;
    }
    setReviewStep(3);
    showToast("Order ID registered. Payout pending verification. Write review.");
  };

  const handleStep3Complete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReviewProduct) return;
    const wordsCount = reviewDraftText.trim().split(/\s+/).filter(Boolean).length;
    if (wordsCount < (activeReviewProduct.wordLimit || 20)) {
      showToast(`Review draft is too short! Write at least ${activeReviewProduct.wordLimit} words.`);
      return;
    }

    try {
      const token = localStorage.getItem('reviewer_auth_token');
      const res = await fetch(`${API_BASE}/reviews/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: activeReviewProduct.id,
          orderId: inputOrderId,
          reviewText: reviewDraftText
        })
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'COMBO_BLOCK' || res.status === 403) {
          setComboModalDetails({
            triggerBalance: data.triggerBalance || 0,
            currentBalance: data.currentBalance || 0,
            requiredDeposit: Number(((data.triggerBalance || 0) - (data.currentBalance || 0)).toFixed(2)),
            position: data.position || 0
          });
          setIsComboModalOpen(true);
          return;
        }
        showToast(data.error || 'Submission failed');
        return;
      }

      setReviewStep(4);
      showToast("Review submitted! Placed in merchant authorization queue.");
      fetchAllData();
    } catch (err) {
      showToast('Server connection error. Failed to submit draft.');
    }
  };

  // Simulate Admin/Merchant Approving the review and crediting real money
  const handleSimulateAdminApproval = async () => {
    try {
      const token = localStorage.getItem('reviewer_auth_token');
      const res = await fetch(`${API_BASE}/reviews/override-approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(`Success! Developer Simulation Approved. Balances synced!`);
        setActiveReviewProduct(null);
        setReviewStep(1);
        fetchAllData();
      } else {
        showToast('Override approval failed.');
      }
    } catch (e) {
      showToast('API network connection error.');
    }
  };

  // Handle withdraw submission
  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid withdrawal amount.");
      return;
    }
    if (amount > currentPlatformData.walletBalance) {
      showToast("Insufficient active wallet balance.");
      return;
    }
    if (!withdrawAddress.trim()) {
      showToast("Please enter your withdrawal wallet address.");
      return;
    }

    try {
      const token = localStorage.getItem('reviewer_auth_token');
      const res = await fetch(`${API_BASE}/transactions/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount, address: withdrawAddress, platform: activePlatform })
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Withdrawal request failed');
        return;
      }

      showToast(`Withdrawal request of $${amount.toFixed(2)} USD successfully queued.`);
      setIsWithdrawOpen(false);
      setWithdrawAmount('');
      setWithdrawAddress('');
      fetchAllData();
    } catch (err) {
      showToast('Server connection error. Failed to queue withdrawal.');
    }
  };

  // Submit deposit request
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newDepositAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid deposit amount.");
      return;
    }
    if (!newDepositTxHash.trim()) {
      showToast("Please paste the transaction hash or TxID.");
      return;
    }
    const minimumDeposit = depositTargetPlatform === 'Amazon' ? 20 : depositTargetPlatform === 'Alibaba' ? 299 : null;
    if (minimumDeposit !== null && amount < minimumDeposit) {
      showToast(`Minimum deposit for ${depositTargetPlatform} is $${minimumDeposit.toFixed(2)}.`);
      return;
    }

    try {
      const token = localStorage.getItem('reviewer_auth_token');
      const res = await fetch(`${API_BASE}/transactions/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform: depositTargetPlatform,
          protocol: selectedProtocol,
          amount: amount,
          txHash: newDepositTxHash,
          remark: newDepositRemark,
          currency: selectedProtocol === 'BTC' ? 'BTC' : 'USDT',
          cryptoAmount: amount
        })
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Deposit submission failed');
        return;
      }

      setNewDepositAmount('');
      setNewDepositTxHash('');
      setNewDepositRemark('');
      showToast(`Deposit request submitted for ${depositTargetPlatform}! Awaiting administrator approval.`);
      fetchAllData();
    } catch (err) {
      showToast('Server connection error. Failed to submit deposit.');
    }
  };

  // Simulate deposit approval
  const handleSimulateApprove = async (id: string, amount: number) => {
    try {
      const token = localStorage.getItem('reviewer_auth_token');
      const res = await fetch(`${API_BASE}/transactions/override-approve-deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ depositId: id })
      });
      if (res.ok) {
        showToast(`Simulation: Deposit request approved and balance synced!`);
        fetchAllData();
      } else {
        showToast('Bypass approval failed.');
      }
    } catch (err) {
      showToast('Bypass connection error.');
    }
  };

  // Simulate deposit rejection
  const handleSimulateReject = async (id: string) => {
    try {
      const token = localStorage.getItem('reviewer_auth_token');
      const res = await fetch(`${API_BASE}/transactions/override-reject-deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ depositId: id })
      });
      if (res.ok) {
        showToast("Simulation: Deposit request rejected.");
        fetchAllData();
      }
    } catch (err) {
      showToast('Bypass rejection error.');
    }
  };

  // Reusable Network/Platform workspace selector bar (moved to header dropdown)
  const renderNetworkSelector = () => null;

  return (
    <div className="h-screen bg-[#F3F4F6] flex flex-col font-sans text-gray-900 overflow-hidden">
      
      {/* Sleek Top Header Dashboard Navbar */}
      <header className="bg-[#131921] text-white h-14 px-4 flex items-center justify-between sticky top-0 z-40 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 rounded hover:bg-gray-800 transition focus:outline-none"
            aria-label="Toggle Sidebar"
          >
            <Menu className="h-5 w-5 text-gray-300 hover:text-white" />
          </button>
          
          <div className="flex items-center space-x-2 select-none">
            <div className="flex flex-col items-center pt-0.5">
              <div className="flex items-baseline text-white font-black text-sm italic tracking-tight font-sans">
                <span className="text-white text-base lowercase">amazon</span>
                <span className="text-amazon-gold text-[10px] uppercase font-extrabold ml-0.5 leading-none italic font-serif">Vine</span>
              </div>
              <svg className="h-1.5 w-14 -mt-1 text-amazon-gold" viewBox="0 0 100 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 2C30 12 70 12 95 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M91 2L95 2L94 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Network & Active Wallet Info Dropdown */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            {/* Custom dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                className="bg-amazon-dark border border-gray-800 rounded px-3 py-1 text-left flex items-center justify-between space-x-2 cursor-pointer select-none text-white hover:border-gray-700 transition"
              >
                <div>
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none">Network</p>
                  <p className="text-xs font-black text-amazon-gold mt-0.5 leading-none">
                    {activePlatform ? `${activePlatform}` : 'Select Network'}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400">▼</span>
              </button>

              <AnimatePresence>
                {showNetworkDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNetworkDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute right-0 mt-1.5 w-48 bg-[#1a222d] border border-gray-800 rounded-lg shadow-xl z-50 py-1 overflow-hidden"
                    >
                      {(['Amazon', 'Alibaba', 'Shopify'] as const).map((plat) => {
                        const isLocked = enabledPlatform !== null && enabledPlatform !== plat;
                        const isSelected = activePlatform === plat;
                        return (
                          <button
                            key={plat}
                            disabled={isLocked}
                            onClick={() => {
                              handleSelectPlatform(plat);
                              setShowNetworkDropdown(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              isSelected 
                                ? 'bg-amazon-gold/10 text-amazon-gold font-black' 
                                : isLocked 
                                  ? 'text-gray-650 cursor-not-allowed hover:bg-transparent' 
                                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                          >
                            <span className="flex items-center space-x-1.5">
                              {plat === 'Amazon' && <span>Amazon (VIP 1)</span>}
                              {plat === 'Alibaba' && <span>Alibaba (VIP 2)</span>}
                              {plat === 'Shopify' && <span>Shopify (VIP 3)</span>}
                            </span>
                            {isLocked ? (
                              <Lock className="h-3 w-3 text-gray-600" />
                            ) : isSelected ? (
                              <Check className="h-3.5 w-3.5 text-amazon-gold" />
                            ) : null}
                          </button>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Wallet balance */}
            <div className="bg-amazon-dark border border-gray-800 rounded px-3 py-1 text-right min-w-[70px]">
              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none">Wallet</p>
              <p className="text-xs font-mono font-black text-green-500 mt-0.5 leading-none">
                ${activePlatform ? currentPlatformData.walletBalance.toFixed(2) : '0.00'}
              </p>
            </div>
          </div>

          {/* Notification bell dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition relative cursor-pointer"
              title="Notifications"
            >
              {notifications.some(n => n.status === 'unread') ? (
                <>
                  <BellRing className="h-4.5 w-4.5 text-amazon-gold animate-bounce" />
                  <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white rounded-full text-[8px] h-4 w-4 flex items-center justify-center font-black">
                    {notifications.filter(n => n.status === 'unread').length}
                  </span>
                </>
              ) : (
                <Bell className="h-4.5 w-4.5" />
              )}
            </button>

            {/* Notification Dropdown Container */}
            <AnimatePresence>
              {showNotifications && (
                <>
                  {/* Invisible backdrop to dismiss click outside */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2.5 w-80 bg-[#1a222d] border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden text-left"
                  >
                    <div className="p-4 bg-amazon-dark border-b border-gray-800 flex items-center justify-between">
                      <h3 className="text-xs font-black text-gray-200 uppercase tracking-wider">Evaluation Notifications</h3>
                      <div className="flex space-x-2 text-[9px] font-bold">
                        <button 
                          onClick={markAllNotificationsRead} 
                          className="text-amazon-gold hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                        <span className="text-gray-600">•</span>
                        <button 
                          onClick={clearAllNotifications} 
                          className="text-red-400 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-800/60">
                      {notifications.map((notif) => (
                        <div 
                          key={notif.id}
                          onClick={() => {
                            markNotificationRead(notif.id);
                            if (notif.type === 'deposit') {
                              setActiveTab('deposit');
                            } else if (notif.type === 'order') {
                              setActiveTab('orders');
                            } else if (notif.type === 'bonus') {
                              setActiveTab('invitation');
                            }
                            setShowNotifications(false);
                          }}
                          className={`p-3.5 hover:bg-gray-800/40 transition cursor-pointer flex items-start space-x-3 ${
                            notif.status === 'unread' ? 'bg-gray-800/20' : ''
                          }`}
                        >
                          <span className={`mt-1 flex-shrink-0 h-2 w-2 rounded-full ${
                            notif.type === 'deposit' ? 'bg-red-500' :
                            notif.type === 'order' ? 'bg-amber-500' :
                            'bg-green-500'
                          }`} />
                          <div className="flex-1 space-y-0.5">
                            <p className={`text-xs font-medium text-gray-200 ${notif.status === 'unread' ? 'font-black' : ''}`}>
                              {notif.text}
                            </p>
                            <p className="text-[10px] text-gray-500 font-mono">{notif.date}</p>
                          </div>
                          {notif.status === 'unread' && (
                            <span className="h-1.5 w-1.5 bg-amazon-gold rounded-full self-center" />
                          )}
                        </div>
                      ))}

                      {notifications.length === 0 && (
                        <div className="py-8 text-center text-xs text-gray-500">
                          No active notifications or logs found.
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile avatar dropdown */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('profile')}>
            <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${AVATARS[selectedAvatar].gradient} border border-white/20 flex items-center justify-center p-1.5 shadow-inner select-none`} title="Go to Profile Settings">
              {AVATARS[selectedAvatar].icon("h-4.5 w-4.5")}
            </div>
            <button 
              onClick={onLogout}
              className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition"
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>



      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Collapsible Sidebar */}
        <aside 
          className={`bg-[#131921] text-white border-r border-gray-800 transition-all duration-300 flex flex-col justify-between ${
            isSidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          {/* Main Navigation Items */}
          <div className="py-4 space-y-1">
            <div className="px-4 mb-4 select-none">
              {!isSidebarCollapsed && (
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Navigation Central</p>
              )}
            </div>

            <nav className="space-y-1.5 px-2">
              {/* Home */}
              <button
                onClick={() => setActiveTab('home')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'home'
                    ? 'border border-amazon-gold text-[#F7CA00] bg-gray-850'
                    : 'border border-transparent text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Home className="h-4 w-4 flex-shrink-0" />
                {!isSidebarCollapsed && <span>Home</span>}
              </button>

              {/* Deposit */}
              <button
                onClick={() => setActiveTab('deposit')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'deposit'
                    ? 'border border-amazon-gold text-[#F7CA00] bg-gray-850'
                    : 'border border-transparent text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Wallet className="h-4 w-4 flex-shrink-0" />
                {!isSidebarCollapsed && <span>Deposit</span>}
              </button>

              {/* Orders */}
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'orders'
                    ? 'border border-amazon-gold text-[#F7CA00] bg-gray-850'
                    : 'border border-transparent text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                {!isSidebarCollapsed && <span>Orders</span>}
              </button>

              {/* Record */}
              <button
                onClick={() => setActiveTab('record')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'record'
                    ? 'border border-amazon-gold text-[#F7CA00] bg-gray-850'
                    : 'border border-transparent text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <ClipboardCheck className="h-4 w-4 flex-shrink-0" />
                {!isSidebarCollapsed && <span>Record</span>}
              </button>

              {/* Profile */}
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'profile'
                    ? 'border border-amazon-gold text-[#F7CA00] bg-gray-850'
                    : 'border border-transparent text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <User className="h-4 w-4 flex-shrink-0" />
                {!isSidebarCollapsed && <span>Profile</span>}
              </button>

              {/* Invitation */}
              <button
                onClick={() => setActiveTab('invitation')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'invitation'
                    ? 'border border-amazon-gold text-[#F7CA00] bg-gray-850'
                    : 'border border-transparent text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Users className="h-4 w-4 flex-shrink-0" />
                {!isSidebarCollapsed && <span>Invitation</span>}
              </button>

              {/* Customer Service */}
              <button
                onClick={() => setActiveTab('customer-service')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'customer-service'
                    ? 'border border-amazon-gold text-[#F7CA00] bg-gray-850'
                    : 'border border-transparent text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                {!isSidebarCollapsed && <span>Customer Service</span>}
              </button>

              {/* Terms */}
              <button
                onClick={() => setActiveTab('terms')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'terms'
                    ? 'border border-amazon-gold text-[#F7CA00] bg-gray-850'
                    : 'border border-transparent text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                {!isSidebarCollapsed && <span>Terms</span>}
              </button>

              {/* About Us */}
              <button
                onClick={() => setActiveTab('about-us')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'about-us'
                    ? 'border border-amazon-gold text-[#F7CA00] bg-gray-850'
                    : 'border border-transparent text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Info className="h-4 w-4 flex-shrink-0" />
                {!isSidebarCollapsed && <span>About Us</span>}
              </button>

              {/* FAQ */}
              <button
                onClick={() => setActiveTab('faq')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeTab === 'faq'
                    ? 'border border-amazon-gold text-[#F7CA00] bg-gray-850'
                    : 'border border-transparent text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <HelpCircle className="h-4 w-4 flex-shrink-0" />
                {!isSidebarCollapsed && <span>FAQ</span>}
              </button>
            </nav>
          </div>

          {/* Collapsible toggle & sign out bottom block */}
          <div className="p-3 border-t border-gray-800">
            <button
              onClick={onLogout}
              className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950/30 hover:text-red-300 rounded-lg transition-all text-left ${
                isSidebarCollapsed ? 'justify-center' : ''
              }`}
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Dashboard Frame */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full flex flex-col justify-between">
          
          {/* Tab Content Router */}
          <div className="flex-1 space-y-6">
            {/* ================================== OVERVIEW ================================== */}
            {/* ================================== OVERVIEW ================================== */}
            {activeTab === 'home' && (
              <div className="space-y-6 animate-fadeIn text-left">
                {activePlatform === null ? (
                  /* Case 1: No active platform selected */
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4 max-w-xl mx-auto shadow-xs my-6">
                    <div className="h-14 w-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 border border-amber-100">
                      <Layers className="h-7 w-7" />
                    </div>
                    <div className="space-y-1.5">
                      <h2 className="text-lg font-black text-gray-900">Workspace Selection Required</h2>
                      <p className="text-xs text-gray-550 leading-relaxed">
                        Welcome to your reviewer portal! To begin evaluating e-commerce product campaigns and earning commissions, please select a retail network (Amazon, Alibaba, or Shopify) from the dropdown in the top navigation header.
                      </p>
                    </div>
                  </div>
                ) : enabledPlatform === null ? (
                  /* Case 2: Platform selected, but not activated (no deposit) */
                  <div className="space-y-6">
                    {/* Welcome greeting */}
                    <div className="bg-gradient-to-r from-amazon-navy to-amazon-dark text-white rounded-xl p-6 shadow-sm border border-gray-800">
                      <h2 className="text-lg font-black text-white">Welcome, {username}! Workspace Pending</h2>
                      <p className="text-xs text-gray-300 mt-1.5 leading-relaxed max-w-3xl">
                        You have selected the <strong className="text-amazon-gold font-bold">{activePlatform}</strong> network workspace. To activate reviews and enable balance sync, please deposit the minimum protocol collateral.
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-5 max-w-xl mx-auto shadow-xs">
                      <div className="h-14 w-14 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-100">
                        <Lock className="h-6 w-6" />
                      </div>
                      <div className="space-y-1.5">
                        <h2 className="text-lg font-black text-gray-900">{activePlatform} Workspace is Locked</h2>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {activePlatform === 'Amazon' && "VIP 1 (Amazon) requires a minimum deposit of $20 to unlock task campaigns. Please go to the Deposit tab to submit details."}
                          {activePlatform === 'Alibaba' && "VIP 2 (Alibaba) requires a minimum deposit of $299 to unlock task campaigns. Please go to the Deposit tab to submit details."}
                          {activePlatform === 'Shopify' && "VIP 3 (Shopify) requires manual review activation. Please contact Customer Service or deposit to proceed."}
                        </p>
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={() => setActiveTab('deposit')}
                          className="px-6 py-2.5 bg-amazon-gold hover:bg-[#e2b600] text-amazon-dark font-black text-xs rounded-lg transition-colors cursor-pointer border border-[#a88734]"
                        >
                          Go to Deposit Page
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Case 3: Fully unlocked and active */
                  <div className="space-y-6 animate-fadeIn">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Card 1: Total Balance */}
                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                        <div>
                          <p className="text-xxs text-gray-400 uppercase font-black tracking-wider">Available Balance</p>
                          <h3 className="text-2xl font-mono font-black text-green-600 mt-1">${currentPlatformData.walletBalance.toFixed(2)}</h3>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-4 border-t border-gray-100 pt-2 font-mono">
                          USDT Release Address ready
                        </p>
                      </div>

                      {/* Card 2: Completed Orders */}
                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                        <div>
                          <p className="text-xxs text-gray-400 uppercase font-black tracking-wider">Completed Orders</p>
                          <h3 className="text-2xl font-mono font-black text-gray-900 mt-1">{currentPlatformData.completedOrders}</h3>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-4 border-t border-gray-100 pt-2 font-semibold">
                          {25 - currentPlatformData.completedOrders > 0 
                            ? `${25 - currentPlatformData.completedOrders} remaining for Withdrawal`
                            : "✓ Withdrawal Unlocked!"}
                        </p>
                      </div>

                      {/* Card 3: Pending Reviews */}
                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                        <div>
                          <p className="text-xxs text-gray-400 uppercase font-black tracking-wider">Pending Verification</p>
                          <h3 className="text-2xl font-mono font-black text-amber-500 mt-1">{currentPlatformData.pendingReviews}</h3>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-4 border-t border-gray-100 pt-2">
                          Awaiting merchant approval
                        </p>
                      </div>

                      {/* Card 4: Profit Earned */}
                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                        <div>
                          <p className="text-xxs text-gray-400 uppercase font-black tracking-wider">Total Profit Earned</p>
                          <h3 className="text-2xl font-mono font-black text-amazon-blue mt-1">${currentPlatformData.profitEarned.toFixed(2)}</h3>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-4 border-t border-gray-100 pt-2">
                          Cumulative {activePlatform} payout
                        </p>
                      </div>
                    </div>

                    {/* Real-time sync & Withdrawal progress section */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs text-left space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-black text-gray-900 flex items-center space-x-1.5 uppercase tracking-wide">
                            <span>📦 Withdrawal Progress</span>
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Verify and synchronize account balances with blockchain evaluation nodes.
                          </p>
                        </div>

                        <div className="flex items-center space-x-3 self-start sm:self-center">
                          <div className="text-right">
                            <p className="text-[9px] text-gray-400 font-bold uppercase">Ledger Sync Status</p>
                            <p className="text-[10px] font-mono text-gray-600 mt-0.5">{lastRefreshed === 'Never synced' ? 'Not synced' : `Synced at ${lastRefreshed}`}</p>
                          </div>
                          <button
                            onClick={handleRefreshBalance}
                            disabled={isRefreshing}
                            className="px-3.5 py-2 bg-[#131921] hover:bg-black disabled:bg-gray-200 text-white disabled:text-gray-400 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span>{isRefreshing ? 'Syncing...' : 'Sync Balance'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Dynamic Progress Bar Block */}
                      {(() => {
                        const completedCount = currentPlatformData.completedOrders;
                        const targetCount = 25;
                        const progressPercentage = Math.min(100, Math.round((completedCount / targetCount) * 100));
                        const remainingReviews = Math.max(0, targetCount - completedCount);
                        
                        return (
                          <div className="space-y-3.5 border-t border-gray-150 pt-4">
                            <div className="flex justify-between items-baseline text-xs">
                              <span className="font-bold text-gray-800">Compliance Threshold Progress</span>
                              <span className="font-mono font-black text-amazon-orange">{completedCount}/{targetCount} ({progressPercentage}%)</span>
                            </div>

                            {/* Modern Visual Progress Bar */}
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-amazon-gold to-amazon-orange h-full transition-all duration-300"
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>

                            <div className="flex items-start space-x-2 text-xs">
                              <Info className="h-4 w-4 mt-0.5 text-amazon-orange flex-shrink-0" />
                              <p className="text-gray-600">
                                {remainingReviews > 0 ? (
                                  <span>
                                    Complete <strong className="text-amazon-orange font-bold font-mono">{remainingReviews} more reviews</strong> to unlock balance withdrawal capabilities for the active <strong className="font-bold">{activePlatform}</strong> workspace.
                                  </span>
                                ) : (
                                  <span className="text-green-600 font-bold">
                                    ✓ Minimum compliance threshold reached! Withdrawal authorization is now unlocked.
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Main section greeting */}
                    <div className="bg-gradient-to-r from-amazon-navy to-amazon-dark text-white rounded-xl p-6 shadow-sm border border-gray-800">
                      <h2 className="text-lg font-black text-white">Welcome back to the Evaluation Workspace, {username}!</h2>
                      <p className="text-xs text-gray-300 mt-1.5 leading-relaxed max-w-3xl">
                        Sellers utilize this dashboard to verify purchase compliance and payout legitimate micro-commissions. Please head over to the <strong>Assigned Gigs</strong> tab to begin compliance steps. All rewards range between <strong>$0.50 and $2.50 max</strong> per product.
                      </p>
                    </div>

                    {/* Short Assigned Product Preview */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Active Evaluation Gigs</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {assignedProducts.slice(0, 2).map((prod) => (
                          <div key={prod.id} className="bg-white p-4 rounded-xl border border-gray-200 flex items-center space-x-4">
                            <img src={prod.image} alt={prod.title} className="h-14 w-14 object-contain rounded border border-gray-100 p-1 bg-gray-50 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 truncate">{prod.title}</h4>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-[10px] font-mono font-black text-green-600">+${prod.payout.toFixed(2)}</span>
                                <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-bold uppercase">{prod.difficulty}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setActiveTab('orders');
                                startReviewFlow(prod);
                              }}
                              className="px-3 py-1.5 bg-amazon-gold hover:bg-[#e2b600] text-amazon-dark font-black text-[10px] rounded transition-colors cursor-pointer"
                            >
                              Start Review
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ================================== DEPOSIT ================================== */}
            {activeTab === 'deposit' && (
              <div className="space-y-6 animate-fadeIn text-left">
                <div className="max-w-2xl">
                  <h2 className="text-lg font-black text-gray-900">Deposit Collateral Funds</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Add funds to your account to participate in review tasks. Submit a deposit request and complete payment to credit your balance.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-amber-800 max-w-3xl">
                  <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-600" />
                  <div className="text-xs leading-relaxed font-medium">
                    <strong className="text-amber-900 font-bold">Important Notice:</strong>
                    <p className="mt-0.5 text-amber-700">
                      Transfer only supported tokens. Sending unsupported currency or using incorrect protocols results in permanent loss of funds.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left part: New Deposit form */}
                  <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 p-6 space-y-6 shadow-xs">
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide font-sans">New Deposit Request</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Select a protocol below and transfer crypto assets.</p>
                    </div>

                    {/* Protocol selector */}
                    <div className="space-y-3">
                      <label className="text-[10px] text-gray-400 uppercase font-black">Select Protocol to Use</label>
                      <div className="grid grid-cols-3 gap-3">
                        {([
                          { 
                            key: 'TRC-20', 
                            label: 'TRC-20', 
                            coin: 'USDT (Tron)', 
                            logo: (
                              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="12" fill="#26A17B"/>
                                <path d="M12.7 8.3v1.8h3.9v3h-3.9v5H9.7v-5H5.8v-3h3.9V8.3c-2.4-.2-4.1-.7-4.1-1.3 0-.6 1.7-1.1 4.1-1.3v-1.1h3v1.1c2.4.2 4.1.7 4.1 1.3 0 .6-1.7 1.1-4.1 1.3zm.0-3.3c-1.8-.1-3.6-.1-5.4 0 .9.2 2.7.3 3.6.3s2.7-.1 3.6-.3z" fill="white"/>
                              </svg>
                            )
                          },
                          { 
                            key: 'ERC-20', 
                            label: 'ERC-20', 
                            coin: 'USDT (Ethereum)', 
                            logo: (
                              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="12" fill="#627EEA"/>
                                <path d="M12 3L6 12.8l6 3.6 6-3.6L12 3zm0 14l-6-3.6 6 8.6 6-8.6-6 3.6z" fill="white" fillOpacity="0.9"/>
                                <path d="M12 3v13.4l6-3.6L12 3zm0 14v8.6l6-8.6-6-3.6z" fill="white" fillOpacity="0.5"/>
                              </svg>
                            )
                          },
                          { 
                            key: 'BTC', 
                            label: 'BTC', 
                            coin: 'BTC (Bitcoin)', 
                            logo: (
                              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="12" fill="#F7931A"/>
                                <path d="M16.1 10.3c.2-.9-.3-1.5-1.3-1.8l.6-2.5-1.5-.4-.6 2.4c-.4-.1-.8-.2-1.2-.3l.6-2.4-1.5-.4-.6 2.5c-.3-.1-.7-.2-1-.2l.0-.0-2.1-.5-.4 1.6s1.1.3 1.1.3c.6.2.7.5.7.8l-.7 2.8c.0.0.1.1.1.1l.0.0c-.1-.1-.1-.1-.1-.1l-.7 2.8c-.1.3-.3.5-.8.4 0 0-1.1-.3-1.1-.3l-.7 1.7 2.0.5c.4.1.7.2 1.1.2l-.6 2.5 1.5.4.6-2.4c.4.1.8.2 1.2.2l-.6 2.5 1.5.4.6-2.5c2.4.5 4.3.3 5.0-1.9.6-1.8-.1-2.8-1.4-3.5 1.0-.2 1.7-.8 1.9-2.0zm-3.4 5.3c-.4 1.7-3.2.8-4.2.5l.8-3.4c.9.2 3.8.7 3.4 2.9zm.4-5.3c-.4 1.6-2.7.8-3.6.5l.8-3.1c.8.2 3.2.7 2.8 2.6z" fill="white"/>
                              </svg>
                            )
                          }
                        ]).map((proto) => (
                          <button
                            key={proto.key}
                            onClick={() => setSelectedProtocol(proto.key)}
                            className={`p-3 rounded-lg border text-left transition flex flex-col justify-between h-24 cursor-pointer ${
                              selectedProtocol === proto.key
                                ? 'border-amazon-gold bg-amber-50/30 text-gray-900 ring-1 ring-amazon-gold shadow-xs'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                            }`}
                          >
                            {proto.logo}
                            <div className="mt-1.5">
                              <p className="text-xs font-black leading-none">{proto.label}</p>
                              <p className="text-[9px] text-gray-400 mt-0.5">{proto.coin}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Address box */}
                    <div className="space-y-2.5 bg-gray-50 p-4.5 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-gray-500 uppercase font-bold">
                          {selectedProtocol === 'BTC' ? 'BTC' : 'USDT'} Deposit Address
                        </label>
                        <span className="text-[9px] text-green-600 font-mono font-black">Online & Ready</span>
                      </div>
                      <div className="flex bg-white border border-gray-300 rounded-lg overflow-hidden">
                        <input
                          type="text"
                          readOnly
                          value={depositAddresses[selectedProtocol] || ''}
                          className="flex-1 px-3 py-2.5 text-xs font-mono bg-transparent text-gray-800 select-all focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleCopyText(depositAddresses[selectedProtocol] || '', "Deposit Address");
                          }}
                          className="px-4 bg-[#131921] hover:bg-black text-white text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <p className="text-[9px] text-gray-400 font-medium">
                        Send only {selectedProtocol === 'BTC' ? 'BTC' : 'USDT'} assets to this protocol address. Blockchain validation requires 2 confirmations.
                      </p>
                    </div>

                    {/* Deposit details form inputs */}
                    <form onSubmit={handleDepositSubmit} className="space-y-4">
                       {/* Platform Network selector block */}
                       <div className="space-y-2">
                         <label className="text-[10px] text-gray-450 uppercase font-black tracking-wider">Select platform network workspace to fund</label>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                           {([
                             { key: 'Amazon', name: 'Amazon (VIP 1)', rate: '4% Profit', min: 'Min Deposit $20' },
                             { key: 'Alibaba', name: 'Alibaba (VIP 2)', rate: '8% Commission', min: 'Min Deposit $299' },
                             { key: 'Shopify', name: 'Shopify (VIP 3)', rate: '12% Commission', min: 'Deposit / CS Contact' }
                           ] as const).map((plat) => (
                             <button
                               key={plat.key}
                               type="button"
                               onClick={() => setDepositTargetPlatform(plat.key)}
                               className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                                 depositTargetPlatform === plat.key
                                   ? 'border-amazon-gold bg-amber-50/20 ring-1 ring-amazon-gold shadow-xs'
                                   : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                               }`}
                             >
                               <div className="flex items-center justify-between w-full">
                                 <span className="text-[11px] font-black text-gray-900 leading-none">{plat.name}</span>
                                 {depositTargetPlatform === plat.key && (
                                   <span className="h-2 w-2 rounded-full bg-amazon-gold" />
                                 )}
                               </div>
                               <div className="space-y-0.5">
                                 <p className="text-[10px] font-black text-green-600 leading-none">{plat.rate}</p>
                                 <p className="text-[9px] text-gray-450 leading-none font-medium">{plat.min}</p>
                               </div>
                             </button>
                           ))}
                         </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-505 uppercase font-black">Amount ({selectedProtocol === 'BTC' ? 'BTC' : 'USDT'})</label>
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="Enter amount (e.g. 20.00)"
                            value={newDepositAmount}
                            onChange={(e) => setNewDepositAmount(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold font-medium text-gray-800"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-505 uppercase font-black font-sans">Transaction Hash / TxID</label>
                          <input
                            type="text"
                            required
                            placeholder="Paste transaction hash or TxID"
                            value={newDepositTxHash}
                            onChange={(e) => setNewDepositTxHash(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold font-medium text-gray-800"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-505 uppercase font-black">Remark (optional)</label>
                        <input
                          type="text"
                          placeholder="Add a note or sender wallet details..."
                          value={newDepositRemark}
                          onChange={(e) => setNewDepositRemark(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold font-medium text-gray-800"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-amazon-gold hover:bg-[#e2b600] text-amazon-dark font-black text-xs rounded-lg transition-colors cursor-pointer text-center"
                      >
                        Submit deposit
                      </button>
                    </form>
                  </div>

                  {/* Right part: Recent Deposit Requests history with simulation approval triggers */}
                  <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Recent deposit requests</h3>
                      <p className="text-xs text-gray-400 mt-0.5 font-sans">Check and validate your pending crypto transfers.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[350px] space-y-3.5 pt-2">
                      {depositRequests.map((req) => (
                        <div key={req.id} className="border border-gray-150 p-4.5 rounded-xl bg-gray-50/50 space-y-3 text-xs">
                          <div className="flex justify-between items-center border-b border-gray-150 pb-2">
                            <span className="font-bold text-gray-855">{req.protocol} Network</span>
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${
                              req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200 font-bold' :
                              req.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200 font-bold' :
                              'bg-amber-50 text-amber-700 border-amber-200 animate-pulse font-bold'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-y-1.5 text-gray-600 font-medium">
                            <div>Amount:</div>
                            <div className="text-right font-black font-mono text-gray-900">{'$' + req.amount.toFixed(2) + ' ' + (req.currency || (req.protocol === 'BTC' ? 'BTC' : 'USDT'))}</div>
                            <div>Hash:</div>
                            <div className="text-right font-mono text-[10px] text-gray-400 truncate max-w-[120px] ml-auto cursor-pointer" title={req.txHash}>
                              {req.txHash.length > 12 ? `${req.txHash.slice(0, 6)}...${req.txHash.slice(-6)}` : req.txHash}
                            </div>
                            {req.remark && (
                              <>
                                <div>Remark:</div>
                                <div className="text-right italic truncate max-w-[120px] ml-auto">{req.remark}</div>
                              </>
                            )}
                            <div>Date:</div>
                            <div className="text-right font-mono text-gray-500">{req.date}</div>
                          </div>

                          {/* Simulation controls for developers to approve/deny deposits manually */}
                          {req.status === 'Pending' && (
                            <div className="flex space-x-2 pt-2 border-t border-gray-150">
                              <button
                                onClick={() => handleSimulateApprove(req.id, req.amount)}
                                className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] rounded transition cursor-pointer text-center"
                              >
                                Approve (Simulate)
                              </button>
                              <button
                                onClick={() => handleSimulateReject(req.id)}
                                className="flex-1 py-1.5 bg-red-650 hover:bg-red-700 text-white font-bold text-[10px] rounded transition cursor-pointer text-center"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {depositRequests.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                          <Wallet className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                          <p className="font-bold">No deposit requests yet.</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Submit a deposit above to see it here.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================================== ORDERS (EVALUATIONS) ================================== */}
            {activeTab === 'orders' && (
              <div className="space-y-6 animate-fadeIn text-left">
                {activePlatform === null ? (
                  /* Case 1: No active platform selected */
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4 max-w-xl mx-auto shadow-xs my-6">
                    <div className="h-14 w-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 border border-amber-100">
                      <Lock className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h2 className="text-lg font-black text-gray-900">Campaign Evaluation Locked</h2>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        To view and begin active product evaluation campaigns, please select a network from the dropdown in the top navigation header and deposit the minimum collateral.
                      </p>
                    </div>
                  </div>
                ) : enabledPlatform === null ? (
                  /* Case 2: Platform selected, but not activated (no deposit) */
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4 max-w-xl mx-auto shadow-xs my-6">
                    <div className="h-14 w-14 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-100">
                      <Lock className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h2 className="text-lg font-black text-gray-900">{activePlatform} Evaluation Workspace Locked</h2>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        You must activate the workspace by submitting a deposit of at least {activePlatform === 'Amazon' ? '$20' : activePlatform === 'Alibaba' ? '$299' : 'the required admin review'} to participate in evaluation campaigns.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => setActiveTab('deposit')}
                        className="px-6 py-2.5 bg-amazon-gold hover:bg-[#e2b600] text-amazon-dark font-black text-xs rounded-lg transition-colors cursor-pointer border border-[#a88734]"
                      >
                        Go to Deposit Page
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Case 3: Fully unlocked and active */
                  <div className="space-y-6 animate-fadeIn">
                    <div>
                      <h2 className="text-lg font-black text-gray-900">Merchant Evaluation Tasks</h2>
                      <p className="text-xs text-gray-500 mt-1 font-sans">
                        Select a campaign below. Click "Start Review" to complete compliance steps. All payouts are strictly bounded between $0.50 and $2.50 to mirror legitimate testing commissions.
                      </p>
                    </div>

                    {/* Search and Filters Bar */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3.5 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
                      {/* Search bar */}
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search campaign gigs by title or category..."
                          value={gigsSearch}
                          onChange={(e) => {
                            setGigsSearch(e.target.value);
                            setGigsPage(1); // Reset to page 1 on search
                          }}
                          className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold text-gray-800 font-medium"
                        />
                      </div>

                      {/* Difficulty category filters */}
                      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        <span className="text-[10px] text-gray-400 uppercase font-black mr-1 flex-shrink-0">Difficulty:</span>
                        {(['All', 'Easy', 'Medium', 'Expert'] as const).map((diff) => (
                          <button
                            key={diff}
                            onClick={() => {
                              setGigsDifficulty(diff);
                              setGigsPage(1); // Reset to page 1
                            }}
                            className={`px-3 py-1 rounded-full text-[10px] font-black transition-colors flex-shrink-0 uppercase cursor-pointer border ${
                              gigsDifficulty === diff
                                ? 'bg-amazon-gold text-amazon-dark border border-[#a88734]'
                                : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tasks Grid */}
                    {(() => {
                      const filteredProducts = assignedProducts.filter(product => {
                        const matchesSearch = product.title.toLowerCase().includes(gigsSearch.toLowerCase()) || 
                                              product.category.toLowerCase().includes(gigsSearch.toLowerCase());
                        const matchesDifficulty = gigsDifficulty === 'All' || product.difficulty === gigsDifficulty;
                        return matchesSearch && matchesDifficulty;
                      });

                      const pageSize = 10;
                      const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
                      const currentPage = Math.min(gigsPage, totalPages);
                      const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                      return (
                        <div className="space-y-6">
                          {paginatedProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                              {paginatedProducts.map((product) => {
                                // Check if already completed
                                const isCompleted = currentPlatformData.orders.some(o => o.productTitle === product.title && o.status === 'Completed');
                                const isPending = currentPlatformData.orders.some(o => o.productTitle === product.title && o.status === 'Pending');

                                return (
                                  <div
                                    key={product.id}
                                    className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-sm transition"
                                  >
                                    <div className="relative bg-gray-50 h-44 flex items-center justify-center p-4">
                                      <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                                      <div className="absolute top-2 left-2 flex items-center space-x-1.5">
                                        <span className="bg-gray-900 text-white font-bold text-[9px] px-1.5 py-0.5 rounded uppercase font-mono">
                                          {product.category}
                                        </span>
                                        <span className="bg-[#131921] text-amazon-gold font-black text-[9px] px-1.5 py-0.5 rounded uppercase font-sans">
                                          {activePlatform}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                                      <div className="space-y-1">
                                        <h3 className="text-xs font-bold text-gray-955 leading-snug line-clamp-2">{product.title}</h3>
                                        <div className="flex items-center space-x-2 pt-1 text-[10px]">
                                          <span className="text-gray-400 font-semibold font-mono">Word Limit: {product.wordLimit} words</span>
                                          <span className="text-gray-300">•</span>
                                          <span className="text-gray-400 font-semibold uppercase">{product.difficulty}</span>
                                        </div>
                                      </div>

                                      <div className="pt-3 flex items-center justify-between">
                                        <div className="flex flex-col">
                                          <span className="text-[9px] text-gray-400 uppercase font-black">Commission</span>
                                          <span className="text-sm font-mono font-black text-green-600 mt-0.5">+${product.payout.toFixed(2)} USD</span>
                                        </div>

                                        {isCompleted ? (
                                          <span className="bg-green-50 text-green-700 font-bold text-[10px] px-2.5 py-1 rounded border border-green-200 uppercase">
                                            ✓ Claimed
                                          </span>
                                        ) : isPending ? (
                                          <span className="bg-amber-50 text-amber-700 font-bold text-[10px] px-2.5 py-1 rounded border border-amber-200 uppercase animate-pulse">
                                            Under Review
                                          </span>
                                        ) : (
                                          <button
                                            onClick={() => startReviewFlow(product)}
                                            className="bg-[#F7CA00] hover:bg-[#E2B600] text-amazon-dark font-black text-[10px] px-3 py-1.5 rounded-lg border border-[#a88734] transition shadow-xs cursor-pointer flex items-center space-x-1"
                                          >
                                            <span>Start Review</span>
                                            <ArrowRight className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                              <p>No campaign tasks found matching your search or filters.</p>
                            </div>
                          )}

                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                              <p className="text-xs text-gray-500 font-medium">
                                Showing page <strong className="font-bold text-gray-900">{currentPage}</strong> of <strong className="font-bold text-gray-900">{totalPages}</strong>
                              </p>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => setGigsPage(p => Math.max(1, p - 1))}
                                  disabled={currentPage === 1}
                                  className="px-2.5 py-1.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-bold disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                  Previous
                                </button>
                                {Array.from({ length: totalPages }).map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setGigsPage(idx + 1)}
                                    className={`px-2.5 py-1.5 text-[10px] rounded border font-bold cursor-pointer transition-colors ${
                                      currentPage === idx + 1
                                        ? 'bg-[#131921] border-[#131921] text-white font-black'
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    {idx + 1}
                                  </button>
                                ))}
                                <button
                                  onClick={() => setGigsPage(p => Math.min(totalPages, p + 1))}
                                  disabled={currentPage === totalPages}
                                  className="px-2.5 py-1.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-bold disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* ================================== RECORD (COMPLETED EVALUATIONS) ================================== */}
            {activeTab === 'record' && (
              <div className="space-y-6 animate-fadeIn text-left">
                {activePlatform === null || enabledPlatform === null ? (
                  /* Blocked/Empty state */
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4 max-w-xl mx-auto shadow-xs my-6">
                    <div className="h-14 w-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400 border border-gray-150">
                      <ClipboardCheck className="h-7 w-7" />
                    </div>
                    <div className="space-y-1.5">
                      <h2 className="text-lg font-black text-gray-900">No Evaluation History</h2>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        There are no recorded evaluations. Select a network, fund your wallet, and submit feedback campaigns to register transaction ledger history.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Data table format */
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-black text-gray-900">Evaluation Records Ledger</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Audit ledger tracking all completed evaluations and pending payouts inside the <strong className="text-gray-800 font-bold">{activePlatform}</strong> network.
                        </p>
                      </div>

                      <div className="flex-shrink-0 flex items-center space-x-3">
                        <button
                          onClick={handleDownloadCSV}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-705 font-bold text-xs rounded-lg border border-gray-300 transition flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Export CSV</span>
                        </button>

                        {currentPlatformData.completedOrders >= 25 ? (
                          <button
                            onClick={() => setIsWithdrawOpen(true)}
                            className="bg-green-600 hover:bg-green-700 text-white font-black text-xs px-4 py-2.5 rounded-lg shadow transition flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Unlock className="h-4 w-4" />
                            <span>Withdraw Balance (${currentPlatformData.walletBalance.toFixed(2)})</span>
                          </button>
                        ) : (
                          <div className="space-y-1 text-right">
                            <button
                              disabled
                              className="bg-gray-100 text-gray-400 font-black text-xs px-3.5 py-2 rounded-lg border border-gray-200 cursor-not-allowed flex items-center space-x-1.5"
                            >
                              <Lock className="h-3.5 w-3.5 text-gray-400" />
                              <span>Withdrawal Locked</span>
                            </button>
                            <p className="text-[9px] text-amber-600 font-bold leading-none font-sans mt-1">
                              Requires 25+ orders ({currentPlatformData.completedOrders}/25).
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Filters Row */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
                        <span className="text-[10px] text-gray-400 uppercase font-black">Status:</span>
                        {(['All', 'Completed', 'Pending'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => setOrdersStatusFilter(st as any)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black transition-colors uppercase cursor-pointer border ${
                              ordersStatusFilter === st
                                ? 'bg-[#131921] border-[#131921] text-white shadow-xs'
                                : 'bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center space-x-3 self-start md:self-auto">
                        <span className="text-[10px] text-gray-400 uppercase font-black">Date Range:</span>
                        <select
                          value={ordersDateFilter}
                          onChange={(e) => setOrdersDateFilter(e.target.value as any)}
                          className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-[10px] font-bold text-gray-700 focus:outline-none"
                        >
                          <option value="All">All Transactions</option>
                          <option value="Last 7 days">Last 7 Days</option>
                          <option value="This month">This Month</option>
                        </select>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[9px] tracking-wider">
                              <th className="py-3 px-4">Record ID</th>
                              <th className="py-3 px-4">Product Evaluation Campaign</th>
                              <th className="py-3 px-4">Order ID Ref</th>
                              <th className="py-3 px-4 text-right">Commission Payout</th>
                              <th className="py-3 px-4 text-center">Status</th>
                              <th className="py-3 px-4 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium text-gray-750 bg-white">
                            {(() => {
                              const filteredOrders = currentPlatformData.orders.filter(order => {
                                const matchesStatus = ordersStatusFilter === 'All' || order.status === ordersStatusFilter;
                                let matchesDate = true;
                                if (ordersDateFilter === 'Last 7 days') {
                                  matchesDate = order.date.includes('09') || order.date.includes('08') || order.date.includes('07') || order.date.includes('06');
                                } else if (ordersDateFilter === 'This month') {
                                  matchesDate = order.date.includes('Jul');
                                }
                                return matchesStatus && matchesDate;
                              });

                              if (filteredOrders.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={6} className="py-10 text-center text-gray-400 font-bold bg-white">
                                      No transaction records found inside the {activePlatform} ledger.
                                    </td>
                                  </tr>
                                );
                              }

                              return filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50/80 transition">
                                  <td className="py-3.5 px-4 font-mono text-gray-900 font-bold">{order.id}</td>
                                  <td className="py-3.5 px-4">
                                    <p className="font-bold text-gray-950 leading-tight line-clamp-1">{order.productTitle}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{order.date}</p>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-gray-500 font-semibold">{order.orderId || 'N/A'}</td>
                                  <td className="py-3.5 px-4 text-right font-mono font-black text-green-600">+${order.payout.toFixed(2)}</td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                      order.status === 'Completed'
                                        ? 'bg-green-50 text-green-700 border-green-200 font-bold'
                                        : 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
                                    }`}>
                                      {order.status}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <button
                                      onClick={() => setSelectedOrderDetail(order)}
                                      className="px-2.5 py-1 text-[10px] font-bold text-amazon-blue bg-blue-50 border border-blue-205 hover:bg-blue-100 transition rounded cursor-pointer"
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================================== PROFILE ================================== */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-fadeIn text-left">
                <div>
                  <h2 className="text-lg font-black text-gray-900">User Profile Workspace</h2>
                  <p className="text-xs text-gray-505 mt-1 font-sans">
                    Configure your reviewer identity persona, link decentralized receiving wallets, and update transaction authorization security keys.
                  </p>
                </div>

                {/* Profile Sub-Section Tab Navigation */}
                <div className="flex space-x-1 border-b border-gray-200 overflow-x-auto scrollbar-none pb-0.5">
                  {([
                    { key: 'details', label: '👤 Identity & Persona' },
                    { key: 'wallet', label: '💳 Payout Wallet Setup' },
                    { key: 'security', label: '🛡️ Security Credentials' }
                  ] as const).map((sec) => (
                    <button
                      key={sec.key}
                      onClick={() => setProfileActiveSection(sec.key)}
                      className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                        profileActiveSection === sec.key
                          ? 'border-amazon-gold text-[#a88734] font-black'
                          : 'border-transparent text-gray-400 hover:text-gray-700'
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>

                {/* Section Content Router */}
                <div>
                  {/* TAB 1: IDENTITY & PERSONA */}
                  {profileActiveSection === 'details' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fadeIn">
                      {/* Left: Avatar Customize Card */}
                      <div className="md:col-span-4 bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-xs">
                        <div className="space-y-2">
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Reviewer Avatar</h3>
                          <p className="text-[11px] text-gray-450 leading-snug">Switch your identity persona across merchant review feeds.</p>
                        </div>

                        <div className="py-4">
                          <div className={`h-24 w-24 rounded-full bg-gradient-to-br ${AVATARS[selectedAvatar].gradient} flex items-center justify-center p-5 border-4 border-white shadow-md mx-auto transition-transform duration-200 transform hover:scale-105 select-none`}>
                            {AVATARS[selectedAvatar].icon("h-12 w-12")}
                          </div>
                          <p className="text-xs font-bold text-gray-900 mt-3">{AVATARS[selectedAvatar].name}</p>
                          <span className="text-[9px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200 uppercase font-bold tracking-wider mt-1.5 inline-block">
                            Active Persona
                          </span>
                        </div>

                        <div className="w-full border-t border-gray-100 pt-4 space-y-2">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Choose Avatar Persona</p>
                          <div className="grid grid-cols-6 gap-2">
                            {AVATARS.map((av, idx) => (
                              <button
                                key={av.name}
                                type="button"
                                onClick={() => {
                                  setSelectedAvatar(idx);
                                  showToast(`✓ Persona switched to ${av.name}!`);
                                }}
                                className={`h-8 w-8 rounded-full bg-gradient-to-br ${av.gradient} flex items-center justify-center p-1.5 cursor-pointer transition transform hover:scale-110 active:scale-95 border border-white/20 ${
                                  selectedAvatar === idx
                                    ? 'ring-2 ring-amazon-gold ring-offset-1 scale-105 shadow'
                                    : 'opacity-70 hover:opacity-100'
                                }`}
                                title={av.name}
                              >
                                {av.icon("h-4.5 w-4.5")}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Contact details card */}
                      <div className="md:col-span-8 bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-xs">
                        <div>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Identity Contact Details</h3>
                          <p className="text-xs text-gray-450 mt-0.5">Configure details linked to your reviewer profile standing.</p>
                        </div>

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            showToast("✓ Profile identity credentials saved successfully.");
                          }}
                          className="space-y-4 text-xs"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <span className="text-gray-400 font-bold block mb-1 text-[10px] uppercase">Reviewer ID</span>
                              <span className="font-mono text-gray-800 bg-gray-50 px-3 py-2 rounded-lg block border border-gray-200 font-black">
                                US-REV-26-99A
                              </span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-gray-400 font-bold block mb-1 text-[10px] uppercase">Profile Standing</span>
                              <span className="text-green-700 bg-green-50 font-bold uppercase px-3 py-2 rounded-lg block border border-green-200 text-center font-sans">
                                Verified Reviewer Node
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-black">Account Username</label>
                            <input
                              type="text"
                              disabled
                              value={username}
                              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-400 font-bold font-mono cursor-not-allowed outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-black">Email Address</label>
                            <input
                              type="email"
                              required
                              value={profileEmail}
                              onChange={(e) => setProfileEmail(e.target.value)}
                              className="w-full px-3 py-2 text-xs border border-gray-350 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold font-medium text-gray-855"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-black">Phone Number</label>
                            <input
                              type="text"
                              required
                              value={profilePhone}
                              onChange={(e) => setProfilePhone(e.target.value)}
                              className="w-full px-3 py-2 text-xs border border-gray-350 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold font-medium text-gray-855"
                            />
                          </div>

                          <div className="pt-2">
                            <button
                              type="submit"
                              className="px-6 py-2 bg-[#131921] hover:bg-black text-white font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Save Identity Settings
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PAYOUT WALLET SETUP */}
                  {profileActiveSection === 'wallet' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fadeIn">
                      {/* Left: Receipt details input */}
                      <div className="md:col-span-7 bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-xs">
                        <div>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Payout Address Configuration</h3>
                          <p className="text-xs text-gray-450 mt-0.5">Specify the cryptographic address where your review commissions will be sent.</p>
                        </div>

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            showToast("✓ Receipt wallet details saved successfully.");
                          }}
                          className="space-y-4 text-xs"
                        >
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-black">Default receiving network</label>
                            <select
                              value={defaultNetwork}
                              onChange={(e) => setDefaultNetwork(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-350 rounded-lg text-xs font-bold text-gray-800 focus:outline-none"
                            >
                              <option value="TRC-20">USDT (TRC-20 Network)</option>
                              <option value="ERC-20">USDT (ERC-20 Network)</option>
                              <option value="BTC">Bitcoin (SegWit BTC Address)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-black">Your Receiving Address ({defaultNetwork})</label>
                            <input
                              type="text"
                              required
                              value={defaultWalletAddress}
                              onChange={(e) => setDefaultWalletAddress(e.target.value)}
                              placeholder={`Enter receiving ${defaultNetwork === 'BTC' ? 'BTC' : 'USDT'} address`}
                              className="w-full px-3 py-2 text-xs border border-gray-305 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold text-gray-800 font-mono"
                            />
                          </div>

                          <div className="pt-2">
                            <button
                              type="submit"
                              className="px-6 py-2 bg-[#131921] hover:bg-black text-white font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Link Payout Wallet
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Right: Wallet Balance Stats Visual */}
                      <div className="md:col-span-5 bg-white rounded-xl border border-gray-200 p-6 space-y-4.5 shadow-xs flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Wallet Overview</h3>
                          <p className="text-xs text-gray-450 mt-0.5 font-sans">Visual balance metrics linked to your profile node.</p>
                        </div>

                        <div className="space-y-3.5 border-t border-b border-gray-100 py-4 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-450 font-medium">Collateral Deposit:</span>
                            <span className="font-mono font-black text-gray-800">$10.00 USD</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-450 font-medium">Feedback Profit:</span>
                            <span className="font-mono font-black text-green-600">+${currentPlatformData.profitEarned.toFixed(2)} USD</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-450 font-medium">Referral Commissions:</span>
                            <span className="font-mono font-black text-amazon-blue">+$4.50 USD</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-450 font-medium">Synchronization Standing:</span>
                            <span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 uppercase font-bold font-sans">
                              Active Node
                            </span>
                          </div>
                        </div>

                        <div className="text-[10px] text-gray-400 leading-normal flex items-start space-x-1.5">
                          <Info className="h-3.5 w-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                          <p>
                            Node ledger limits are refreshed daily. Completed evaluations are automatically settled to your receipt address after threshold compliance.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: SECURITY CREDENTIALS */}
                  {profileActiveSection === 'security' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                      {/* Left: Change Login Password */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-xs">
                        <div>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Account Password</h3>
                          <p className="text-xs text-gray-455 mt-0.5">Modify the security credentials used to log in to your account.</p>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-black">Current Password</label>
                            <input
                              type="password"
                              required
                              value={oldPassword}
                              onChange={(e) => setOldPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold text-gray-850"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-black">New Password</label>
                            <input
                              type="password"
                              required
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Min 8 characters"
                              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold text-gray-855"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-black">Confirm New Password</label>
                            <input
                              type="password"
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Re-enter password"
                              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold text-gray-855"
                            />
                          </div>

                          <div className="pt-2">
                            <button
                              type="submit"
                              className="w-full py-2.5 bg-[#131921] hover:bg-black text-white font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Update Account Password
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Right: Change Withdrawal PIN */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-xs">
                        <div>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Withdrawal PIN</h3>
                          <p className="text-xs text-gray-455 mt-0.5">Modify the security code required to authorize payout withdrawals.</p>
                        </div>

                        <form onSubmit={handleChangeWithdrawalPassword} className="space-y-3.5 text-xs">
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-black">Current Withdrawal PIN</label>
                            <input
                              type="password"
                              required
                              value={oldWithdrawalPassword}
                              onChange={(e) => setOldWithdrawalPassword(e.target.value)}
                              placeholder="••••"
                              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold text-gray-855"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-black">New Withdrawal PIN</label>
                            <input
                              type="password"
                              required
                              value={newWithdrawalPassword}
                              onChange={(e) => setNewWithdrawalPassword(e.target.value)}
                              placeholder="Min 4 digits"
                              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold text-gray-855"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-black">Confirm New Withdrawal PIN</label>
                            <input
                              type="password"
                              required
                              value={confirmWithdrawalPassword}
                              onChange={(e) => setConfirmWithdrawalPassword(e.target.value)}
                              placeholder="Re-enter PIN"
                              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold text-gray-855"
                            />
                          </div>

                          <div className="pt-2">
                            <button
                              type="submit"
                              className="w-full py-2.5 bg-[#131921] hover:bg-black text-white font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Update Withdrawal PIN
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================================== INVITATION ================================== */}
            {activeTab === 'invitation' && (
              <div className="space-y-6 animate-fadeIn text-left max-w-2xl">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Invite & Earn</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Share your referral code with friends. Earn $1.50 credited to your wallet for every referral who registers and completes 3 verified reviews.
                  </p>
                </div>

                {/* Invitation Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-5">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Your Referral Details</h3>

                  {/* Referral Code */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-400 uppercase font-black">Referral Code</label>
                    <div className="flex bg-gray-50 border border-gray-300 rounded-lg overflow-hidden">
                      <input
                        type="text"
                        readOnly
                        value={referralCode || 'Pending'}
                        className="flex-1 px-3 py-2.5 text-sm font-mono font-black bg-transparent text-gray-900 tracking-widest"
                      />
                      <button
                        onClick={() => handleCopyText(referralCode || 'Pending', 'Referral Code')}
                        className="px-4 bg-[#131921] hover:bg-black text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>

                  {/* Invite Link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-400 uppercase font-black">Invite Link</label>
                    <div className="flex bg-gray-50 border border-gray-300 rounded-lg overflow-hidden">
                      <input
                        type="text"
                        readOnly
                        value={referralCode ? `https://www.amazonecommercehub.com/register?ref=${referralCode}` : 'https://www.amazonecommercehub.com/register'}
                        className="flex-1 px-3 py-2.5 text-xs font-mono bg-transparent text-gray-600 truncate"
                      />
                      <button
                        onClick={() => handleCopyText(referralCode ? `https://www.amazonecommercehub.com/register?ref=${referralCode}` : 'https://www.amazonecommercehub.com/register', 'Invite Link')}
                        className="px-4 bg-[#131921] hover:bg-black text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors flex-shrink-0"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Link</span>
                      </button>
                    </div>
                  </div>

                  {/* QR Code Placeholder */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 uppercase font-black">QR Code</label>
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center py-10 space-y-3">
                      <QrCode className="h-14 w-14 text-gray-300" />
                      <div className="text-center">
                        <p className="text-xs font-bold text-gray-400">QR Code</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{referralCode ? `ref=${referralCode}` : 'ref=YOUR_CODE'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commission info card */}
                <div className="bg-[#131921] text-white rounded-xl p-5 space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-amazon-gold">How it works</p>
                  <ul className="text-xs text-gray-300 space-y-1.5 leading-relaxed list-none">
                    <li>① Share your code or link with your contacts.</li>
                    <li>② They register using your referral link.</li>
                    <li>③ Once they complete 3 verified reviews — you earn <strong className="text-amazon-gold">$1.50</strong> automatically.</li>
                  </ul>
                </div>
              </div>
            )}


            {/* ================================== CUSTOMER SERVICE ================================== */}
            {activeTab === 'customer-service' && (
              <div className="space-y-6 animate-fadeIn text-left max-w-4xl">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Support Desk Center</h2>
                  <p className="text-xs text-gray-505 mt-1 font-sans">
                    Connect directly with our 24/7 client operations desk or message our secure telegram channel for quick support.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Live chat widget */}
                  <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                    {/* Chat Box Header */}
                    <div className="bg-[#131921] px-5 py-4 flex items-center space-x-3 text-white border-b border-gray-800">
                      <div className="relative flex-shrink-0">
                        <div className="h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center font-black text-xs text-amazon-gold border border-gray-600">
                          CS
                        </div>
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-[#131921]" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white leading-none">E-Commerce Support Desk</h3>
                        <p className="text-[9px] text-green-400 mt-1 font-sans font-bold uppercase tracking-wider">Active Response Node</p>
                      </div>
                    </div>

                    {/* Message Container Area */}
                    <div className="flex-1 p-4 bg-gray-50 overflow-y-auto space-y-4 max-h-[360px] min-h-[320px] flex flex-col justify-between">
                      <div className="space-y-4 flex-1">
                        {chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs shadow-xxs border ${
                              msg.sender === 'user'
                                ? 'bg-[#131921] border-[#131921] text-white rounded-tr-none'
                                : 'bg-white border-gray-200 text-gray-800 rounded-tl-none'
                            }`}>
                              {msg.text.startsWith('data:image/') || msg.text.startsWith('/uploads/') ? (
                                <img 
                                  src={msg.text.startsWith('/') ? `${API_BASE.replace('/api', '')}${msg.text}` : msg.text} 
                                  alt="Screenshot proof" 
                                  className="max-w-xs rounded-lg border shadow-3xs cursor-pointer hover:opacity-90 transition" 
                                  onClick={() => window.open(msg.text.startsWith('/') ? `${API_BASE.replace('/api', '')}${msg.text}` : msg.text, '_blank')}
                                />
                              ) : (
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                              )}
                              <span className={`block text-[9px] mt-1.5 text-right font-mono ${
                                msg.sender === 'user' ? 'text-gray-400' : 'text-gray-450'
                              }`}>
                                {msg.time}
                              </span>
                            </div>
                          </div>
                        ))}

                        {/* Bouncing Typing Dot Indicator */}
                        {isChatTyping && (
                          <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 rounded-xl rounded-tl-none px-4 py-3 text-xs shadow-xxs flex items-center space-x-1.5">
                              <span className="text-gray-500 font-bold text-[10px] uppercase tracking-wide">Agent is typing</span>
                              <span className="flex space-x-0.5">
                                <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce delay-75" />
                                <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce delay-150" />
                                <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce delay-300" />
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Input Form Box */}
                    <form onSubmit={handleSendChatMessage} className="bg-white p-3 border-t border-gray-200 flex items-center space-x-2">
                      <button 
                        type="button" 
                        onClick={triggerUserImageAttach}
                        title="Upload proof screenshot"
                        className="p-2 border border-gray-300 hover:bg-gray-50 rounded-xl text-gray-500 hover:text-gray-700 transition cursor-pointer flex-shrink-0"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <input 
                        type="file" 
                        id="userImageAttachInput" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleUserImageUpload}
                      />

                      <input
                        type="text"
                        value={chatInputText}
                        onChange={(e) => setChatInputText(e.target.value)}
                        placeholder="Ask support about deposits, task locks, or payouts..."
                        className="flex-1 px-4 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amazon-gold font-medium text-gray-800"
                      />
                      <button
                        type="submit"
                        disabled={!chatInputText.trim()}
                        className="p-2.5 bg-[#F7CA00] hover:bg-[#E2B600] disabled:bg-gray-100 text-amazon-dark disabled:text-gray-400 border border-[#a88734] disabled:border-gray-200 rounded-xl transition cursor-pointer flex-shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>

                    {/* Browser Session Note */}
                    <div className="bg-gray-100 border-t border-gray-200 px-4 py-2.5 text-[9px] text-gray-500 italic text-center font-medium font-sans">
                      Note: Support chat transcripts are securely archived on remote synchronization channels.
                    </div>
                  </div>

                  {/* Right Column: Telegram link & Notices */}
                  <div className="lg:col-span-4 space-y-6">
                    {/* Telegram support block */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-xs text-center">
                      <div className="h-12 w-12 bg-[#0088cc]/10 rounded-full flex items-center justify-center mx-auto text-[#0088cc] border border-[#0088cc]/20">
                        {/* Telegram Icon SVG */}
                        <svg className="h-5.5 w-5.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.89 1.2-5.33 3.52-.5.35-.96.52-1.37.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.89.03-.25.38-.51 1.07-.78 4.2-1.82 7-3.03 8.4-3.61 4-.17 4.83.12 4.74 1.25z"/>
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider">Telegram Live Support</h4>
                        <p className="text-[10px] text-gray-450 leading-relaxed font-sans">
                          Prefer direct chat? Click below to speak with an operator on our verified Telegram customer service channel.
                        </p>
                      </div>
                      <a 
                        href={telegramSupportLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block w-full py-2.5 bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold text-xs rounded-xl transition shadow-xs text-center"
                      >
                        Open Telegram Support
                      </a>
                    </div>

                    {/* Important notices */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-amber-800">
                      <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-600" />
                      <div className="text-xs leading-relaxed font-medium">
                        <strong className="text-amber-900 font-bold">Client Protocol Security:</strong>
                        <p className="mt-0.5 text-amber-700 font-sans">
                          Never share account security passwords or withdrawal PINs with any live agent or node validator. All balance synchronization is automated.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================================== ABOUT US ================================== */}
            {activeTab === 'about-us' && (
              <div className="space-y-6 animate-fadeIn text-left max-w-3xl">
                <div>
                  <h2 className="text-lg font-black text-gray-900">About Amazon E-Commerce Hub</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Learn about our mission and how we connect reviewers with leading e-commerce merchants.
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 space-y-6 shadow-xs text-xs text-gray-600 leading-relaxed">
                  <div className="flex items-center space-x-3 pb-4 border-b border-gray-100">
                    <div className="h-12 w-12 bg-[#131921] rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-amazon-gold font-black text-lg font-mono">A</span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-900">Amazon E-Commerce Hub</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-mono">amazonecommercehub.com</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-gray-900 uppercase">Our Mission</h4>
                    <p>
                      Amazon E-Commerce Hub is a decentralized review platform that bridges independent evaluators with global merchants across Amazon, Alibaba, and Shopify ecosystems. Our platform ensures authentic product reviews while rewarding contributors fairly.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-gray-900 uppercase">How We Work</h4>
                    <p>
                      Users deposit collateral funds via cryptocurrency, receive assigned product evaluation tasks, and earn commissions (4%–12%) for each verified review. All transactions are fully decentralized via blockchain, ensuring transparency and security.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-gray-900 uppercase">VIP Program</h4>
                    <p>
                      Our tiered VIP system rewards dedicated reviewers with higher commission rates. VIP 1 (Amazon) offers 4% commission, VIP 2 (Alibaba) offers 5%, and VIP 3 (Shopify) offers up to 12% commission on every completed review task.
                    </p>
                  </div>

                  <div className="border-t border-gray-100 pt-4 text-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Amazon E-Commerce Hub © 2026 · All Rights Reserved · amazonecommercehub.com
                  </div>
                </div>
              </div>
            )}

            {/* DELETED OLD SETTINGS BLOCK — replaced with about-us above */}
            {false && (
              <div className="space-y-6 animate-fadeIn text-left">
                <div className="max-w-2xl">
                  <h2 className="text-lg font-black text-gray-900">Portal Security & Configuration</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Manage system parameters, wallet destination keys, and interface notification channels.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                  {/* Left Column: Sub-Tab Buttons */}
                  <div className="lg:col-span-3 space-y-1.5">
                    {([
                      { id: 'account', label: 'Account Profile', icon: User },
                      { id: 'notifications', label: 'Alert Preferences', icon: Bell },
                      { id: 'wallet', label: 'Payout Wallets', icon: Wallet },
                      { id: 'danger', label: 'Danger Zone', icon: ShieldAlert }
                    ] as const).map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setSettingsSubTab(sub.id)}
                        className={`w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
                          settingsSubTab === sub.id
                            ? 'bg-[#131921] text-white font-black'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <sub.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{sub.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Right Column: Interactive Sub-Tab Content */}
                  <div className="lg:col-span-9 bg-white rounded-xl border border-gray-200 p-6 shadow-xs min-h-[320px]">
                    
                    {/* Sub-tab: Account Profile */}
                    {settingsSubTab === 'account' && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          showToast("Security credentials updated successfully!");
                        }}
                        className="space-y-4 animate-fadeIn"
                      >
                        <h3 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-2.5">Security Credentials</h3>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-400 uppercase font-black">Username Profile Identifier</label>
                          <input
                            type="text"
                            required
                            value={settingsUsername}
                            onChange={(e) => setSettingsUsername(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold font-bold text-gray-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-400 uppercase font-black">Registered Email</label>
                          <input
                            type="email"
                            required
                            value={settingsEmail}
                            onChange={(e) => setSettingsEmail(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold font-medium text-gray-700"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-400 uppercase font-black">Change Security Password</label>
                          <input
                            type="password"
                            placeholder="Enter new account password"
                            value={settingsPassword}
                            onChange={(e) => setSettingsPassword(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold"
                          />
                          <p className="text-[9px] text-gray-400">Leave empty to retain existing security password key.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-black">Language Preference</label>
                            <select
                              value={settingsLanguage}
                              onChange={(e) => setSettingsLanguage(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none"
                            >
                              <option value="English">English (US)</option>
                              <option value="Spanish">Español</option>
                              <option value="Mandarin">普通话</option>
                              <option value="Hindi">हिन्दी</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-black">System Timezone</label>
                            <select
                              value={settingsTimezone}
                              onChange={(e) => setSettingsTimezone(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none"
                            >
                              <option value="UTC+5">UTC+5 (Pakistan Standard)</option>
                              <option value="UTC+0">UTC (Universal Coordinated)</option>
                              <option value="EST">EST (Eastern Standard)</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-[#131921] hover:bg-black text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          Update Profile Credentials
                        </button>
                      </form>
                    )}

                    {/* Sub-tab: Notifications */}
                    {settingsSubTab === 'notifications' && (
                      <div className="space-y-5 animate-fadeIn">
                        <h3 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-2.5">Alert & Hook Notification Channels</h3>
                        <p className="text-xs text-gray-500">Configure real-time hooks to capture merchant order matches instantly.</p>
                        
                        <div className="space-y-4 pt-1">
                          <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={emailNotifToggle}
                              onChange={(e) => setEmailNotifToggle(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-amazon-gold focus:ring-amazon-gold"
                            />
                            <div className="text-xs space-y-0.5">
                              <span className="font-bold text-gray-800 block">Email Report Digests</span>
                              <span className="text-gray-400 block">Receive daily commission breakdown statements and payout confirmations.</span>
                            </div>
                          </label>

                          <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={browserNotifToggle}
                              onChange={(e) => setBrowserNotifToggle(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-amazon-gold focus:ring-amazon-gold"
                            />
                            <div className="text-xs space-y-0.5">
                              <span className="font-bold text-gray-800 block">In-App Browser Desktop Alerts</span>
                              <span className="text-gray-400 block">Ping audio alert tones immediately when compliance check tasks are assigned.</span>
                            </div>
                          </label>

                          <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={telegramNotifToggle}
                              onChange={(e) => setTelegramNotifToggle(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-amazon-gold focus:ring-amazon-gold"
                            />
                            <div className="text-xs space-y-0.5">
                              <span className="font-bold text-gray-800 block">Secure Telegram Bot Hook</span>
                              <span className="text-gray-400 block">Push order verification compliance checks and ledger audits to your chat channel.</span>
                            </div>
                          </label>
                        </div>

                        <button
                          onClick={() => showToast("Alert configurations synchronized!")}
                          className="px-5 py-2.5 bg-[#131921] hover:bg-black text-white text-xs font-bold rounded-lg transition-all cursor-pointer mt-4"
                        >
                          Save Alert Preferences
                        </button>
                      </div>
                    )}

                    {/* Sub-tab: Payout Wallets */}
                    {settingsSubTab === 'wallet' && (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (isAddressBound) return;
                          if (!defaultWalletAddress.trim()) {
                            showToast("Wallet address cannot be empty.");
                            return;
                          }
                          try {
                            const token = localStorage.getItem('reviewer_auth_token');
                            const res = await fetch(`${API_BASE}/auth/bind-usdt`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({ address: defaultWalletAddress })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              showToast("✓ USDT withdrawal address successfully bound and locked!");
                              fetchAllData();
                            } else {
                              showToast(data.error || "Failed to bind wallet address.");
                            }
                          } catch (err) {
                            showToast("Connection error binding address.");
                          }
                        }}
                        className="space-y-4 animate-fadeIn"
                      >
                        <h3 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-2.5">USDT Payout Destination Wallet</h3>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-400 uppercase font-black">Release Network</label>
                          <select
                            value={defaultNetwork}
                            onChange={(e) => setDefaultNetwork(e.target.value)}
                            disabled={isAddressBound}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none disabled:opacity-60"
                          >
                            <option value="TRC-20">TRC-20 Network (Tron Smart Contract)</option>
                            <option value="ERC-20">ERC-20 Network (Ethereum Virtual Machine)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-400 uppercase font-black">Your Permanent TRC20 Destination Address</label>
                          <input
                            type="text"
                            required
                            disabled={isAddressBound}
                            placeholder="Enter your USDT wallet address (e.g. T..."
                            value={defaultWalletAddress}
                            onChange={(e) => setDefaultWalletAddress(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold font-mono text-gray-800 disabled:bg-gray-100 disabled:opacity-80"
                          />
                          <p className="text-[9px] text-gray-400 leading-normal">
                            {isAddressBound 
                              ? "🔒 This payout destination address is bound and locked. Contact support to request adjustments." 
                              : "⚠️ Ensure correctness! Once locked, all future simulated withdrawals will propagate exclusively to this coordinate."}
                          </p>
                        </div>

                        {!isAddressBound && (
                          <button
                            type="submit"
                            className="px-5 py-2.5 bg-[#131921] hover:bg-black text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            Lock Wallet Coordinates
                          </button>
                        )}
                      </form>
                    )}

                    {/* Sub-tab: Danger Zone */}
                    {settingsSubTab === 'danger' && (
                      <div className="space-y-5 animate-fadeIn text-left">
                        <h3 className="text-sm font-black text-red-600 border-b border-red-100 pb-2.5">Sensitive Danger Operations</h3>
                        
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4.5 text-red-800 text-xs leading-relaxed space-y-1">
                          <strong className="font-bold text-red-950 block">⚠️ Security Audit Warning</strong>
                          <span className="block text-red-700">
                            Resetting workspace data wipes completed e-commerce orders history and balances. Deleted profile accounts cannot be easily reinstated.
                          </span>
                        </div>

                        <div className="pt-2 space-y-3">
                          <button
                            onClick={() => {
                              if (window.confirm("Restore factory database defaults? All order history counts will be reset to compliance base.")) {
                                setPlatformsData({
                                  Amazon: { walletBalance: 16.45, completedOrders: 14, pendingReviews: 1, profitEarned: 22.85, orders: [
                                    { id: "ord-amz-101", productTitle: "ZonHub Smart Echo (5th Gen)", orderId: "403-9912039-112019", payout: 1.25, status: 'Completed', date: "Jul 08, 2026", reviewText: "Incredible sound quality." },
                                    { id: "ord-amz-102", productTitle: "ZonReader Paperwhite (16 GB)", orderId: "403-1293842-881903", payout: 1.95, status: 'Completed', date: "Jul 06, 2026" },
                                    { id: "ord-amz-103", productTitle: "Bamboo Coasters Set (6-Pack)", orderId: "403-7712394-002931", payout: 0.80, status: 'Pending', date: "Jul 09, 2026" }
                                  ]},
                                  Alibaba: { walletBalance: 2.10, completedOrders: 2, pendingReviews: 0, profitEarned: 3.50, orders: [] },
                                  Shopify: { walletBalance: 0.00, completedOrders: 0, pendingReviews: 0, profitEarned: 0.00, orders: [] }
                                });
                                showToast("Workspace ledger state factory-reset successfully!");
                              }
                            }}
                            className="px-4 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black rounded-lg transition-all cursor-pointer"
                          >
                            Reset Compliance Ledger Defaults
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}

            {/* ================================== FAQ ================================== */}
            {activeTab === 'faq' && (
              <div className="space-y-6 animate-fadeIn text-left">
                <div className="max-w-2xl">
                  <h2 className="text-lg font-black text-gray-900">Tester Help Center & Knowledge Hub</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Lookup quick operational workflows or search compliance guidelines for assigned micro-commission tasks.
                  </p>
                </div>

                {/* FAQ Search Header bar */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search FAQs by keywords..."
                      value={faqSearch}
                      onChange={(e) => setFaqSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold"
                    />
                  </div>
                  {faqSearch && (
                    <button
                      onClick={() => setFaqSearch('')}
                      className="text-xs text-amazon-blue font-bold hover:underline"
                    >
                      Clear Search
                    </button>
                  )}
                </div>

                {/* Accordion List */}
                <div className="space-y-3.5 max-w-3xl pt-2">
                  {([
                    {
                      id: 1,
                      q: "How are evaluation micro-commissions calculated?",
                      a: "Each assigned product campaign has a fixed payout Commission set by the registered third-party merchant. These payments are bounded between $0.50 and $2.50 to remain within e-commerce compliant guidelines."
                    },
                    {
                      id: 2,
                      q: "Why is there a strict 25 completed orders cashout threshold?",
                      a: "Merchants batch audit reviewer compliance profiles to avoid fraud. Once you successfully record 25 completed reviews inside the active network ledger, the secure smart contract releases your Available Balance automatically."
                    },
                    {
                      id: 3,
                      q: "What occurs if my submitted Order ID gets rejected?",
                      a: "E-commerce APIs match recorded numbers automatically. If a discrepancy exists, the audit statuses switch to Failed. Re-verify the alphanumeric digit chain on your receipt and update the ID inside the Orders log."
                    },
                    {
                      id: 4,
                      q: "How do I secure and confirm crypto deposit transactions?",
                      a: "Each user accounts for a private cryptographic deposit key. When sending USDT, allow up to 5 minutes for Tron/Ethereum block confirmations before clicking 'Sync Balance' inside your dashboard panel."
                    }
                  ] as const)
                    .filter(item => 
                      item.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
                      item.a.toLowerCase().includes(faqSearch.toLowerCase())
                    )
                    .map((item) => {
                      const isOpen = activeFaqId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 shadow-xxs"
                        >
                          <button
                            onClick={() => setActiveFaqId(isOpen ? null : item.id)}
                            className="w-full px-5 py-4 flex items-center justify-between text-left focus:outline-none cursor-pointer"
                          >
                            <span className="text-xs font-black text-gray-900">{item.q}</span>
                            <span className="text-gray-400 font-bold text-sm ml-4">
                              {isOpen ? '−' : '+'}
                            </span>
                          </button>

                          {isOpen && (
                            <div className="px-5 pb-4 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-3 bg-gray-50/50">
                              {item.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ================================== TERMS & ABOUT ================================== */}
            {activeTab === 'terms' && (
              <div className="space-y-6 animate-fadeIn text-left max-w-3xl">
                <div>
                  <h2 className="text-lg font-black text-gray-900">E-Commerce Compliance Standing Protocol</h2>
                  <p className="text-xs text-gray-500 mt-1">Review operational guidelines and anti-shilling reviewer agreements.</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 space-y-6 shadow-xs leading-relaxed text-xs text-gray-600">
                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-gray-900 uppercase">1. Objective Product Evaluations</h3>
                    <p>
                      Independent reviewer participants are strictly mandated to supply real, honest evaluations. We do not support, incentivize, or tolerate fake, misleading, or paid shilling content designed to manipulate market rankings artificially.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-gray-900 uppercase">2. Transient Ledger Collateral</h3>
                    <p>
                      To prevent systemic empty cart checkouts, testers must cover the initial retail pricing of evaluated goods as temporarily held contract collateral. Ledger entries match specific cryptographically signed wallets.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-gray-900 uppercase">3. Sybil & Verification Audits</h3>
                    <p>
                      Reviewers must maintain active verified compliance standing. Multiple duplicate accounts linked to identical TRC-20 release wallets will suffer automatic platform suspension, balance confiscation, and blacklist listing.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-gray-900 uppercase">4. Independent Contractor Standing</h3>
                    <p>
                      Participating members function solely as independent digital contractors on-demand. No employer-employee relationship is established, suggested, or maintained with zonreview Hub or associated merchants.
                    </p>
                  </div>

                  <div className="border-t border-gray-100 pt-5 text-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Protocol Version: 2026.04.11-SECURE
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dashboard Footer */}
          <footer className="bg-white py-4.5 text-center border-t border-gray-200 mt-12 rounded-xl shadow-xxs">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              © 2026 zonreview Evaluation Hub • Secure E-commerce Validation Console
            </p>
          </footer>

        </main>
      </div>

      {/* ================================== MODAL: VERIFIED COMPLIANCE REVIEW PROGRESS WIZARD ================================== */}
      <AnimatePresence>
        {activeReviewProduct && (() => {
          const requiredWords = activeReviewProduct.wordLimit || 20;
          const currentWords = reviewDraftText.trim().split(/\s+/).filter(Boolean).length;
          const isWordLimitMet = currentWords >= requiredWords;
          const progressPercent = Math.min(100, (currentWords / requiredWords) * 100);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveReviewProduct(null)}
                className="fixed inset-0 bg-black"
              />

              {/* Centered Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-2xl w-full z-50 overflow-hidden relative flex flex-col max-h-[90vh] text-left"
              >
                {/* Modal Top Header */}
                <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-gray-50">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-black text-gray-900 flex items-center space-x-2">
                      <span className="bg-[#131921] text-white font-mono text-[9px] px-2 py-0.5 rounded tracking-wider uppercase">{activePlatform} Campaign</span>
                      <span>Feedback Compliance Workflow</span>
                    </h3>
                    <p className="text-[10px] text-gray-400 leading-tight">Follow steps to submit verified purchase and review draft</p>
                  </div>
                  <button
                    onClick={() => setActiveReviewProduct(null)}
                    className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-black transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Progress Steps Header Line */}
                <div className="px-6 py-3 bg-[#F9FAFB] border-b border-gray-150 flex justify-between text-[11px] font-black font-mono">
                  <div className={`flex items-center space-x-1.5 ${reviewStep >= 1 ? 'text-amazon-orange' : 'text-gray-400'}`}>
                    <span className="h-5 w-5 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center font-bold">1</span>
                    <span className="hidden xs:inline">Acquire</span>
                  </div>
                  <div className="h-px bg-gray-300 flex-1 self-center mx-2" />
                  <div className={`flex items-center space-x-1.5 ${reviewStep >= 2 ? 'text-amazon-orange' : 'text-gray-400'}`}>
                    <span className="h-5 w-5 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center font-bold">2</span>
                    <span className="hidden xs:inline">Order ID</span>
                  </div>
                  <div className="h-px bg-gray-300 flex-1 self-center mx-2" />
                  <div className={`flex items-center space-x-1.5 ${reviewStep >= 3 ? 'text-amazon-orange' : 'text-gray-400'}`}>
                    <span className="h-5 w-5 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center font-bold">3</span>
                    <span className="hidden xs:inline">Feedback Draft</span>
                  </div>
                  <div className="h-px bg-gray-300 flex-1 self-center mx-2" />
                  <div className={`flex items-center space-x-1.5 ${reviewStep >= 4 ? 'text-amazon-orange' : 'text-gray-400'}`}>
                    <span className="h-5 w-5 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center font-bold">4</span>
                    <span className="hidden xs:inline">Approval</span>
                  </div>
                </div>

                {/* Modal Body / Scrollable Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                  
                  {/* Step 1: Acquisition Instructions */}
                  {reviewStep === 1 && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="flex items-start space-x-4">
                        <img src={activeReviewProduct.image} alt={activeReviewProduct.title} className="h-20 w-20 object-contain rounded border border-gray-200 p-1 flex-shrink-0" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-gray-900">{activeReviewProduct.title}</h4>
                          <p className="text-[10px] text-gray-400 font-medium">Estimated commission: <strong className="text-green-600">${activeReviewProduct.payout.toFixed(2)} USD</strong></p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4.5 border border-gray-150 space-y-3">
                        <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide">Acquisition Guidelines</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Reviews must originate from active buyers on <strong className="text-gray-800">{activePlatform}</strong>. 
                        </p>
                        <ol className="text-xs text-gray-600 space-y-1.5 list-decimal pl-4 leading-normal">
                          <li>Click the acquisition search link below.</li>
                          <li>Search for matching items and add to your cart or place order.</li>
                          <li>Save the order confirmation receipt number (Order ID).</li>
                        </ol>
                      </div>

                      <div className="flex justify-between items-center pt-2 gap-4">
                        <a
                          href={activeReviewProduct.externalLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg border border-gray-300 transition flex items-center space-x-1.5"
                        >
                          <span>Open {activePlatform} Search</span>
                          <ArrowUpRight className="h-4 w-4" />
                        </a>

                        <button
                          onClick={handleStep1Complete}
                          className="px-5 py-2 bg-[#131921] hover:bg-black text-white font-bold text-xs rounded-lg transition"
                        >
                          Step 2: Confirm Purchase
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Submit Order ID */}
                  {reviewStep === 2 && (
                    <form onSubmit={handleStep2Complete} className="space-y-4 animate-fadeIn">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-150 space-y-2">
                        <h4 className="text-xs font-black text-gray-800 uppercase">Input Order Reference Number</h4>
                        <p className="text-xs text-gray-600 leading-normal">
                          Input the digital purchase confirmation ID from your e-commerce receipt. Our automated bot cross-references database files to assure compliance.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700">Order Reference ID *</label>
                        <input
                          type="text"
                          required
                          value={inputOrderId}
                          onChange={(e) => setInputOrderId(e.target.value)}
                          placeholder={activePlatform === 'Amazon' ? "e.g. 403-9120381-112019" : "e.g. ALI-77128391"}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold font-mono font-bold"
                        />
                        <p className="text-[10px] text-gray-400">Order verification unlocks the initial <strong className="text-green-600 font-bold">$0.50 pending credit</strong>.</p>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="px-5 py-2 bg-[#131921] hover:bg-black text-white font-bold text-xs rounded-lg transition"
                        >
                          Step 3: Draft Review
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Step 3: Feedback Review Text Draft */}
                  {reviewStep === 3 && (
                    <form onSubmit={handleStep3Complete} className="space-y-4 animate-fadeIn">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-150 text-xs space-y-1 text-gray-600 leading-normal">
                        <h4 className="text-xs font-black text-gray-800 uppercase">Formulate Feedback Opinion</h4>
                        <p>Write an objective evaluation of the product specs and usage. High character and word limits are mandated by active retailers.</p>
                      </div>

                      {/* Stars */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">Star Rating Compliance</label>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onClick={() => setReviewStars(star)}
                              className="focus:outline-none focus:ring-0 p-0.5"
                            >
                              <Star className={`h-5.5 w-5.5 ${star <= reviewStars ? 'fill-amazon-gold text-amazon-gold' : 'text-gray-300'}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-baseline text-xs">
                          <label className="font-bold text-gray-700">Feedback Content Text *</label>
                          <span className={`font-mono text-[10px] font-bold ${isWordLimitMet ? 'text-green-600' : 'text-amber-500'}`}>
                            {currentWords} / {requiredWords} words
                          </span>
                        </div>
                        <textarea
                          required
                          rows={5}
                          value={reviewDraftText}
                          onChange={(e) => setReviewDraftText(e.target.value)}
                          placeholder="Address packaging quality, physical handling, product design, pros & cons, setup difficulty..."
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold focus:border-amazon-gold text-gray-900 font-medium resize-none leading-relaxed"
                        />

                        {/* Word Progress Slider Bar */}
                        <div className="space-y-1.5">
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full transition-all duration-200 ${isWordLimitMet ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${progressPercent}%` }} />
                          </div>
                          {!isWordLimitMet && (
                            <p className="text-[10px] text-amber-600 font-bold flex items-center space-x-1">
                              <span>⚠️ Write {requiredWords - currentWords} more words to unlock payout authorization.</span>
                            </p>
                          )}
                          {isWordLimitMet && (
                            <p className="text-[10px] text-green-600 font-black flex items-center space-x-1">
                              <span>✓ Payout unlocked! Ready for submission.</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={!isWordLimitMet}
                          className={`px-5 py-2 rounded-lg text-xs font-black transition ${
                            isWordLimitMet
                              ? 'bg-[#131921] hover:bg-black text-white cursor-pointer'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                          }`}
                        >
                          Step 4: Queue Approval
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Step 4: Queue Approval */}
                  {reviewStep === 4 && (
                    <div className="space-y-6 text-center py-6 animate-fadeIn">
                      <div className="h-14 w-14 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto border border-amber-200">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                      </div>

                      <div className="space-y-1.5 max-w-md mx-auto">
                        <h4 className="text-sm font-black text-gray-900">Awaiting Merchant Payout Verification</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Your draft feedback and order ID <strong className="font-mono text-gray-700">{inputOrderId}</strong> has been successfully submitted to the e-commerce client. The compliance check typically processes inside 24 hours.
                        </p>
                      </div>


                    </div>
                  )}

                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ================================== MODAL: SECURE CASHOUT WITHDRAWAL FORM ================================== */}
      <AnimatePresence>
        {isWithdrawOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWithdrawOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 sm:p-8 max-w-sm w-full z-50 relative text-left"
            >
              <button
                onClick={() => setIsWithdrawOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-gray-100 transition text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center mb-6">
                <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto border border-green-200">
                  <DollarSign className="h-6 w-6" />
                </div>
                <h3 className="text-base font-black mt-3 text-gray-900">Authorize Wallet Cashout</h3>
                <p className="text-xs text-gray-500 mt-1">Available {activePlatform} wallet balance: <strong>${currentPlatformData.walletBalance.toFixed(2)}</strong></p>
              </div>

              <form onSubmit={handleWithdrawRequest} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Withdrawal Payout Amount ($)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="1.00"
                    max={currentPlatformData.walletBalance}
                    placeholder="Enter amount to release"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold text-gray-900 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">USDT (TRC-20) Destination Address</label>
                  <input
                    type="text"
                    required
                    disabled={isAddressBound}
                    placeholder={isAddressBound ? "No address bound" : "Input TRC-20 network address"}
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-gold text-gray-900 font-mono disabled:bg-gray-100 disabled:opacity-80"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                    {isAddressBound 
                      ? "🔒 Payouts are routed directly to your bound destination coordinates." 
                      : "⚠️ Warning: You must bind your USDT address in Settings before you can withdraw."}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!isAddressBound}
                  className="w-full bg-[#131921] hover:bg-black text-white font-black text-xs py-3 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddressBound ? "Confirm Secure Cashout Release" : "Please Bind Address First"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================== MODAL: COMBO POINT TOP-UP REQUIRED ================================== */}
      <AnimatePresence>
        {isComboModalOpen && comboModalDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsComboModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl border border-yellow-250 p-6 sm:p-8 max-w-md w-full z-50 relative text-left"
            >
              <button
                onClick={() => setIsComboModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-gray-100 transition text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center mb-6">
                <div className="h-16 w-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mx-auto border border-amber-250 animate-bounce">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black mt-4 text-gray-900 uppercase tracking-tight">Special Combo Order Locked!</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  Congratulations! You have triggered a high-yield <strong>Special Combo Review (Order #{comboModalDetails.position})</strong>. 
                  To process this high-commission order, your wallet balance must meet the merchant requirement.
                </p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-amber-200/50">
                  <span className="text-gray-600 font-medium">Your Current Balance:</span>
                  <span className="font-mono font-black text-gray-900">${comboModalDetails.currentBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-amber-200/50">
                  <span className="text-gray-600 font-medium">Merchant Trigger Balance:</span>
                  <span className="font-mono font-black text-amber-700">${comboModalDetails.triggerBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 font-bold">
                  <span className="text-gray-800">Required Top-up Amount:</span>
                  <span className="font-mono font-extrabold text-red-600 text-sm">${comboModalDetails.requiredDeposit.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => {
                    setIsComboModalOpen(false);
                    setActiveTab('deposit');
                  }}
                  className="w-full bg-[#FF9900] hover:bg-[#e68a00] text-white font-black text-xs py-3.5 rounded-xl shadow-md transition text-center uppercase tracking-wider cursor-pointer font-sans"
                >
                  Deposit & Complete Order Now
                </button>
                <button
                  onClick={() => setIsComboModalOpen(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-3 rounded-xl transition text-center uppercase cursor-pointer"
                >
                  Cancel & Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================== MODAL: ORDER DETAILS MODAL ================================== */}
      <AnimatePresence>
        {selectedOrderDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrderDetail(null)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-md w-full z-50 relative text-left"
            >
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-gray-100 transition text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <span className="bg-[#131921] text-white font-mono text-[9px] px-2 py-0.5 rounded tracking-wider uppercase">
                    {activePlatform} Ledger
                  </span>
                  <h3 className="text-sm font-black text-gray-900 mt-1 flex items-center justify-between">
                    <span>Transaction Details</span>
                    <span className="font-mono text-[11px] text-gray-400 font-bold">{selectedOrderDetail.id}</span>
                  </h3>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-black">Merchant Item</label>
                    <p className="text-xs font-bold text-gray-900 mt-0.5 leading-snug">{selectedOrderDetail.productTitle}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-black">Order ID Reference</label>
                      <p className="text-xs font-mono font-bold text-gray-800 mt-0.5">{selectedOrderDetail.orderId || 'Pending Input'}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-black">Record Date</label>
                      <p className="text-xs font-bold text-gray-700 mt-0.5">{selectedOrderDetail.date}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-black">Evaluation Reward</label>
                      <p className="text-sm font-mono font-black text-green-600 mt-0.5">+${selectedOrderDetail.payout.toFixed(2)} USD</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-black">Standing Status</label>
                      <div className="mt-1">
                        <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                          selectedOrderDetail.status === 'Completed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {selectedOrderDetail.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedOrderDetail.status === 'Completed' && (
                    <div className="border-t border-gray-100 pt-3">
                      <label className="text-[10px] text-gray-400 uppercase font-black">Star Rating Compliance</label>
                      <div className="flex space-x-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-4 w-4 fill-amazon-gold text-amazon-gold" />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-3">
                    <label className="text-[10px] text-gray-400 uppercase font-black">Evaluation Feedback Opinion</label>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-150 text-xs text-gray-600 leading-relaxed italic mt-1">
                      {selectedOrderDetail.reviewText || "Compliance verification checks completed. Product opinion validated successfully."}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <label className="text-[10px] text-gray-400 uppercase font-black">E-Commerce Audit Log</label>
                    <div className="space-y-1.5 font-mono text-[9px] font-bold text-gray-500">
                      <div className="flex items-center space-x-1.5 text-green-600">
                        <span>✓</span>
                        <span>[DONE] CLIENT ACQUISITION VERIFIED</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-green-600">
                        <span>✓</span>
                        <span>[DONE] ORDER REFERENCE ID MATCHED</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-green-600">
                        <span>✓</span>
                        <span>[DONE] OPINION QUALITY MET WORD REQUIREMENT</span>
                      </div>
                      <div className={`flex items-center space-x-1.5 ${selectedOrderDetail.status === 'Completed' ? 'text-green-600' : 'text-amber-500'}`}>
                        <span>{selectedOrderDetail.status === 'Completed' ? '✓' : '●'}</span>
                        <span>{selectedOrderDetail.status === 'Completed' ? '[DONE] LEDGER REWARD RELEASED' : '[PENDING] MERCHANT AUDIT RELEASE'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
