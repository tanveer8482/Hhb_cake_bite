import { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Calendar, 
  Clock, 
  MessageCircle, 
  X,
  Plus,
  Minus,
  CheckCircle2
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { DocumentData, FirestoreError, QuerySnapshot } from 'firebase/firestore';
import { db } from '@hhb/shared';
import type { Product, CartItem, CheckoutForm } from '@hhb/shared';

const CATEGORIES = ['All', 'Cake', 'Cookie', 'Pastry', 'Cupcake'];

const formatPrice = (price: number) => `Rs. ${price.toLocaleString('en-PK')}`;

const sanitizePakistanWhatsAppNumber = (phoneNumber: string) => {
  const digits = phoneNumber.replace(/\D/g, '');
  if (/^03\d{9}$/.test(digits)) {
    return `92${digits.slice(1)}`;
  }
  if (/^0\d{10}$/.test(digits)) {
    return `92${digits.slice(1)}`;
  }
  if (/^92\d{10}$/.test(digits)) {
    return digits;
  }
  if (/^923\d{9}$/.test(digits)) {
    return digits;
  }
  return digits;
};

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAddSuccessOpen, setIsAddSuccessOpen] = useState(false);
  const [isOrderSuccessOpen, setIsOrderSuccessOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>({
    customerName: '',
    customerPhone: '',
    address: '',
    deliveryDate: '',
    deliveryTime: ''
  });

  // Fetch Products Real-time
  useEffect(() => {
    const q = query(
      collection(db, 'products'),
      where('status', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const prods = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      prods.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() ?? 0;
        const dateB = b.createdAt?.toMillis?.() ?? 0;
        return dateB - dateA;
      });
      setProductsError('');
      setProducts(prods);
    }, (error: FirestoreError) => {
      console.error('Failed to load products:', error);
      setProductsError('Products load nahi ho sake. Firebase permissions ya deployment config check karein.');
    });

    return () => unsubscribe();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { productId: product.id, quantity: 1, product }];
    });
    setIsAddSuccessOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const buildWhatsAppMessage = () => {
    const { customerName, customerPhone, deliveryDate, deliveryTime, address } = checkoutForm;
    const firstItemImage = cart[0]?.product.imageUrl;

    let message = firstItemImage ? `${firstItemImage}\n\n` : '';
    message += `*New Order from HHB Cake Bites*\n`;
    message += `--------------------------\n`;
    message += `*Customer:* ${customerName}\n`;
    if (customerPhone) {
      message += `*Customer WhatsApp:* ${customerPhone}\n`;
    }
    message += `*Delivery Date:* ${deliveryDate}\n`;
    message += `*Delivery Time:* ${deliveryTime}\n`;
    message += `*Address:* ${address || 'Self Pickup'}\n\n`;
    message += `*Order Items:*\n`;
    
    cart.forEach((item, index) => {
      message += `${index + 1}. ${item.product.name}\n`;
      message += `   - Size: ${item.product.size || 'Standard'}\n`;
      message += `   - Flavor: ${item.product.flavor || 'Original'}\n`;
      message += `   - Qty: x${item.quantity}\n`;
      message += `   - Price: ${formatPrice(item.product.price * item.quantity)}\n`;
    });
    
    message += `\n*Total Amount: ${formatPrice(totalPrice)}*`;
    return message;
  };

  const sendWhatsAppServerMessage = async () => {
    const cleanedCustomerPhone = String(checkoutForm.customerPhone).replace(/\D/g, '');
    const sanitizedCustomerPhone = sanitizePakistanWhatsAppNumber(cleanedCustomerPhone);

    if (!/^923\d{9}$/.test(sanitizedCustomerPhone)) {
      alert('Please enter your Pakistani WhatsApp number like 03XXXXXXXXX or +92XXXXXXXXXX. It will be normalized to 923XXXXXXXXXX automatically.');
      return false;
    }

    try {
      console.log('📱 Attempting to send WhatsApp message via Cloud API...');
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: sanitizedCustomerPhone,
          message: buildWhatsAppMessage(),
        }),
      });
      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = rawText;
      }

      console.log('WhatsApp send endpoint response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        rawText,
        data,
      });

      if (response.ok && data && typeof data === 'object' && data.success) {
        console.log('✅ WhatsApp message sent successfully via Cloud API');
        return true;
      } else {
        console.error('❌ WhatsApp Cloud API failed:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ WhatsApp Cloud API request failed:', error);
      return false;
    }
  };

  const handleCheckout = async () => {
    const { customerName, customerPhone, deliveryDate, deliveryTime } = checkoutForm;
    if (cart.length === 0) {
      alert('Your box is empty');
      return;
    }
    if (!customerName || !deliveryDate || !deliveryTime) {
      alert('Please fill in all required fields');
      return;
    }
    if (!customerPhone) {
      alert('Please enter your WhatsApp number');
      return;
    }

    console.log('🛒 Starting checkout process...');
    const didSendMessage = await sendWhatsAppServerMessage();

    if (!didSendMessage) {
      console.error('❌ WhatsApp Cloud API failed');
      alert('Failed to send WhatsApp message. Please try again or contact support.');
      return;
    }

    console.log('✅ Order submitted successfully');
    setIsCartOpen(false);
    setIsAddSuccessOpen(false);
    setIsOrderSuccessOpen(true);
  };

  const proceedToCheckout = () => {
    setIsAddSuccessOpen(false);
    setIsCartOpen(true);
  };

  const handleBackToShop = () => {
    setIsOrderSuccessOpen(false);
    setCart([]);
  };

  // Scheduling Logic
  const now = new Date();
  const minDate = new Date();
  minDate.setDate(now.getDate() + 1); // Tomorrow onwards
  const minDateString = minDate.toISOString().split('T')[0];

  const getAvailableSlots = () => {
    const slots = [];
    const leadTimeLimit = new Date();
    leadTimeLimit.setHours(now.getHours() + 24);
    leadTimeLimit.setMinutes(now.getMinutes());

    const isTomorrow = checkoutForm.deliveryDate === minDateString;

    for (let h = 10; h <= 21; h++) {
      for (let m = 0; m < 60; m += 30) {
        const slotTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
        if (isTomorrow) {
          const [sH, sM] = slotTimeStr.split(':').map(Number);
          const slotDateTime = new Date();
          slotDateTime.setDate(now.getDate() + 1);
          slotDateTime.setHours(sH, sM, 0, 0);

          if (slotDateTime < leadTimeLimit) continue;
        }
        
        slots.push(slotTimeStr);
      }
    }
    // Add 10:00 PM slot
    if (!isTomorrow || new Date(new Date().setDate(now.getDate() + 1)).setHours(22, 0, 0, 0) >= leadTimeLimit.getTime()) {
      slots.push('22:00');
    }
    return slots;
  };

  const availableSlots = getAvailableSlots();


  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
            HHB Cake Bites
          </h1>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-gray-600 hover:text-pink-600 transition-colors"
            >
              <ShoppingBag className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-pink-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-0 py-0">
        {/* Premium Marquee Banner */}
        <div className="relative mb-12 w-full overflow-hidden bg-gradient-to-r from-gold-400 via-cream-100 to-gold-300 py-4 shadow-lg">
          <style>{`
            @keyframes marqueeScroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-100%); }
            }
            .marquee-content {
              animation: marqueeScroll 35s linear infinite;
              white-space: nowrap;
              display: flex;
              gap: 2rem;
            }
            .marquee-content:hover {
              animation-play-state: paused;
            }
            .marquee-glow {
              text-shadow: 0 0 8px rgba(212, 175, 55, 0.6), 
                           0 0 16px rgba(212, 175, 55, 0.4),
                           0 0 2px rgba(62, 39, 35, 0.3);
            }
          `}</style>
          <div className="flex overflow-hidden">
            <div className="marquee-content marquee-glow text-brown-900 font-serif text-lg md:text-xl font-semibold">
              <span>• Chocolate Fudge - RS 2,500</span>
              <span>• Strawberry Dream - RS 2,800</span>
              <span>• Royal Velvet - RS 3,100</span>
              <span>• Caramel Bliss - RS 2,700</span>
              <span>• Vanilla Paradise - RS 2,300</span>
              <span>• Pistachio Elegance - RS 3,200</span>
              <span>• Chocolate Fudge - RS 2,500</span>
              <span>• Strawberry Dream - RS 2,800</span>
              <span>• Royal Velvet - RS 3,100</span>
              <span>• Caramel Bliss - RS 2,700</span>
            </div>
          </div>
        </div>

        {/* Premium Hero Section */}
        <div className="relative mx-4 mb-16 overflow-hidden rounded-3xl bg-gradient-to-br from-cream-100 via-pink-50 to-white shadow-2xl">
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-10 right-20 w-96 h-96 bg-gold-300 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute -bottom-20 left-20 w-72 h-72 bg-pink-200 rounded-full blur-3xl opacity-20"></div>
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 px-6 md:px-12 py-12 md:py-16 items-center">
            {/* Left Column: Typography */}
            <div className="flex flex-col justify-center space-y-6">
              <div>
                <h1 className="font-script text-6xl md:text-7xl text-brown-900 mb-3 leading-tight" style={{ fontStyle: 'italic' }}>
                  Bake Delight
                </h1>
                <div className="w-16 h-1 bg-gradient-to-r from-gold-400 to-gold-500 rounded-full"></div>
              </div>

              <p className="font-serif text-2xl md:text-3xl text-brown-800 leading-relaxed">
                We Bake Your Dreams Into Delicious Reality
              </p>

              <p className="text-gray-700 text-base md:text-lg leading-relaxed max-w-md">
                Handcrafted cakes, pastries, and cookies made with love, the finest ingredients, and an obsession for perfection. Every bite tells a story of passion and artistry.
              </p>

              <button
                onClick={() => {
                  const productsSection = document.querySelector('[data-products-section]');
                  if (productsSection) {
                    productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="w-fit px-8 py-4 bg-gradient-to-r from-gold-400 to-gold-500 text-brown-900 font-bold text-lg rounded-xl shadow-lg shadow-gold-300/50 hover:shadow-xl hover:shadow-gold-400 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                SHOP CAKES
              </button>
            </div>

            {/* Right Column: Cake Cluster */}
            <div className="relative h-80 md:h-96 lg:h-[450px] flex items-center justify-center">
              {/* Blur background circle */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-100/60 to-pink-50/40 rounded-3xl blur-2xl opacity-50"></div>

              {/* Three Cake Images */}
              <div className="relative w-full h-full flex items-center justify-center group perspective">
                {/* Center Cake - Large - using dynamic product or placeholder */}
                <div className="absolute z-20 w-40 md:w-48 h-52 md:h-64 rounded-2xl overflow-hidden shadow-2xl transform group-hover:scale-110 group-hover:translate-y-2 transition-all duration-500 border-4 border-white/80 hover:border-gold-400/50">
                  <img
                    src={products[0]?.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&h=650&fit=crop&q=80'}
                    alt="Premium Chocolate Cake"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>

                {/* Left Cake - Smaller, rotated */}
                <div className="absolute z-10 -left-6 md:-left-10 w-28 md:w-36 h-36 md:h-44 rounded-2xl overflow-hidden shadow-xl transform -rotate-12 group-hover:-rotate-6 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-500 border-4 border-white/60 hover:border-gold-300/50">
                  <img
                    src={products[1]?.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=500&fit=crop&q=80'}
                    alt="Strawberry Dream Cake"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>

                {/* Right Cake - Smaller, rotated */}
                <div className="absolute z-10 -right-6 md:-right-10 w-28 md:w-36 h-36 md:h-44 rounded-2xl overflow-hidden shadow-xl transform rotate-12 group-hover:rotate-6 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-500 border-4 border-white/60 hover:border-gold-300/50">
                  <img
                    src={products[2]?.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=500&fit=crop&q=80'}
                    alt="Royal Velvet Cake"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4" data-products-section>
        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search for your favorite treat..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-full whitespace-nowrap font-medium transition-all ${
                  activeCategory === cat 
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-200' 
                    : 'bg-white text-gray-600 hover:bg-pink-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productsError && (
            <div className="col-span-full rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {productsError}
            </div>
          )}
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group border border-gray-100">
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4">
                  <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-pink-600">
                    {formatPrice(product.price)}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="text-xs font-bold text-pink-500 uppercase tracking-wider mb-2">
                  {product.category}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-500 text-sm mb-6 line-clamp-2">{product.description}</p>
                <button 
                  onClick={() => addToCart(product)}
                  className="w-full py-3 bg-pink-50 text-pink-600 font-bold rounded-xl hover:bg-pink-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add to Box
                </button>
              </div>
            </div>
          ))}
        </div>
        </div>
      </main>

      {/* Add-to-box Success Drawer */}
      {isAddSuccessOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center px-3 py-3 sm:p-6">
          <div className="absolute inset-0 bg-gray-950/35 backdrop-blur-sm" onClick={() => setIsAddSuccessOpen(false)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-pink-100 sm:rounded-[2rem]">
            <div className="bg-gradient-to-r from-pink-50 via-white to-rose-50 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pink-600 text-white shadow-lg shadow-pink-100">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900">Item added to your box!</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {totalItems} {totalItems === 1 ? 'item' : 'items'} ready for your HHB Cake Bites order.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddSuccessOpen(false)}
                  className="rounded-full p-2 text-gray-500 transition hover:bg-white hover:text-pink-600"
                  aria-label="Close add to box summary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[45vh] overflow-y-auto px-5 py-4 sm:px-6">
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.productId} className="flex items-center gap-3 rounded-2xl border border-pink-100 bg-pink-50/40 p-3">
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-bold text-gray-900">{item.product.name}</h4>
                      <p className="text-xs font-medium text-gray-500">Qty {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-pink-600">{formatPrice(item.product.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-pink-100 bg-white p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-600">Box total</span>
                <span className="text-2xl font-extrabold text-gray-900">{formatPrice(totalPrice)}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setIsAddSuccessOpen(false)}
                  className="rounded-2xl border border-pink-200 px-4 py-3 font-bold text-pink-700 transition hover:bg-pink-50"
                >
                  Add More Items
                </button>
                <button
                  type="button"
                  onClick={proceedToCheckout}
                  className="rounded-2xl bg-pink-600 px-4 py-3 font-bold text-white shadow-lg shadow-pink-100 transition hover:bg-pink-700"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Success Modal */}
      {isOrderSuccessOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-gray-950/45 backdrop-blur-sm" />
          <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-emerald-100">
            <div className="bg-gradient-to-b from-emerald-50 via-white to-white px-6 pb-7 pt-8 text-center sm:px-8">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-100 ring-8 ring-emerald-50">
                <CheckCircle2 className="h-11 w-11" strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900">
                Order Placed Successfully!
              </h3>
              <p className="mt-4 text-sm leading-6 text-gray-600">
                Thank you for shopping with Bake Delight. Your order has been received. Our team will contact you shortly on WhatsApp to confirm your delivery details.
              </p>
            </div>

            <div className="border-t border-emerald-100 bg-white px-6 pb-6 sm:px-8">
              <button
                type="button"
                onClick={handleBackToShop}
                className="mt-5 w-full rounded-2xl bg-emerald-600 px-5 py-4 font-bold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
              >
                Back to Shop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Your Sweet Box</h3>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500">Your box is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.productId} className="flex gap-4">
                        <img src={item.product.imageUrl} className="w-20 h-20 rounded-2xl object-cover" />
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{item.product.name}</h4>
                          <p className="text-pink-600 font-medium">{formatPrice(item.product.price)}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <button 
                              onClick={() => updateQuantity(item.productId, -1)}
                              className="p-1 rounded-lg border hover:bg-gray-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-bold w-4 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.productId, 1)}
                              className="p-1 rounded-lg border hover:bg-gray-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 pt-6 border-t">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-pink-500" /> Delivery Schedule
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Date</label>
                        <input 
                          type="date" 
                          min={minDateString}
                          className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-pink-500"
                          value={checkoutForm.deliveryDate}
                          onChange={(e) => setCheckoutForm({...checkoutForm, deliveryDate: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Time</label>
                        <select 
                          className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-pink-500"
                          value={checkoutForm.deliveryTime}
                          onChange={(e) => setCheckoutForm({...checkoutForm, deliveryTime: e.target.value})}
                        >
                          <option value="">Select Time</option>
                          {availableSlots.map(slot => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}

                        </select>
                      </div>
                    </div>

                    <h4 className="font-bold text-gray-900 flex items-center gap-2 pt-4">
                      <Clock className="w-5 h-5 text-pink-500" /> Customer Details
                    </h4>
                    <input 
                      type="text" 
                      placeholder="Your Name"
                      className="w-full p-3 border rounded-xl"
                      value={checkoutForm.customerName}
                      onChange={(e) => setCheckoutForm({...checkoutForm, customerName: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="WhatsApp Number"
                      className="w-full p-3 border rounded-xl"
                      value={checkoutForm.customerPhone}
                      onChange={(e) => setCheckoutForm({...checkoutForm, customerPhone: e.target.value})}
                    />
                    <textarea 
                      placeholder="Delivery Address"
                      className="w-full p-3 border rounded-xl h-24"
                      value={checkoutForm.address}
                      onChange={(e) => setCheckoutForm({...checkoutForm, address: e.target.value})}
                    />
                  </div>
                </>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600 font-medium">Total Price</span>
                  <span className="text-2xl font-bold text-gray-900">{formatPrice(totalPrice)}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                >
                  <MessageCircle className="w-5 h-5" /> Confirm & Order via WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
