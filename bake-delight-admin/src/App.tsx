import { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  Edit3, 
  LogOut, 
  Upload,
  Search,
  CheckCircle,
  XCircle,
  PackageCheck
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, storage, auth } from '@hhb/shared';
import type { Product } from '@hhb/shared';
import { compressImage } from './utils/imageCompression';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<'all' | 'live' | 'hidden'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'Cake',
    size: '',
    flavor: '',
    imageUrl: '',
    status: true
  });


  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const prods = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(prods);
    });
    return () => unsubscribe();
  }, [user]);

  const stats = useMemo(() => {
    return {
      total: products.length,
      live: products.filter(p => p.status).length,
      hidden: products.filter(p => !p.status).length
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesFilter = filter === 'all' || (filter === 'live' ? p.status : !p.status);
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [products, filter, searchQuery]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert('Login failed: ' + (error as any).message);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      // Compress image if it's a photo
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(file);
        } catch (err) {
          console.error('Compression failed:', err);
        }
      }

      const storageRef = ref(storage, `products/${Date.now()}_${fileToUpload.name}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        }, 
        (error) => {
          console.error('Upload error:', error);
          alert('Upload failed: ' + error.message);
          setUploading(false);
        }, 
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData({ ...formData, imageUrl: url });
          setUploading(false);
        }
      );
    } catch (error) {
      console.error('General error:', error);
      alert('Error: ' + (error as any).message);
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) return alert('Please upload an image');
    if (uploading) return alert('Please wait for the image to finish uploading');

    setSaving(true);
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...formData,
          price: Number(formData.price)
        });
      } else {
        await addDoc(collection(db, 'products'), {
          ...formData,
          price: Number(formData.price),
          createdAt: serverTimestamp()
        });
      }
      closeModal();
    } catch (error) {
      console.error('Submit error:', error);
      alert('Operation failed: ' + (error as any).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (product: Product) => {
    await updateDoc(doc(db, 'products', product.id), { status: !product.status });
  };

  const deleteProduct = async (id: string) => {
    if (confirm('Are you sure?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        size: product.size || '',
        flavor: product.flavor || '',
        imageUrl: product.imageUrl,
        status: product.status
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        category: 'Cake',
        size: '',
        flavor: '',
        imageUrl: '',
        status: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard className="w-8 h-8 text-slate-900" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
            <p className="text-slate-500">Sign in to manage your bakery</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
              <input 
                type="email" 
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900" 
                placeholder="admin@hhb.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all">
              Login to Dashboard
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg text-white">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">HHB Admin</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl font-medium">
            <Package className="w-5 h-5" /> Products
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
            <p className="text-slate-500">Manage your product catalog</p>
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> Add New Product
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button 
            onClick={() => setFilter('all')}
            className={`card flex items-center gap-4 text-left transition-all ${filter === 'all' ? 'ring-2 ring-slate-900' : ''}`}
          >
            <div className="p-4 bg-slate-100 rounded-2xl">
              <Package className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500">Total Products</p>
              <h4 className="text-2xl font-black">{stats.total}</h4>
            </div>
          </button>
          <button 
            onClick={() => setFilter('live')}
            className={`card flex items-center gap-4 text-left transition-all ${filter === 'live' ? 'ring-2 ring-green-600' : ''}`}
          >
            <div className="p-4 bg-green-50 rounded-2xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-600">Live Items</p>
              <h4 className="text-2xl font-black">{stats.live}</h4>
            </div>
          </button>
          <button 
            onClick={() => setFilter('hidden')}
            className={`card flex items-center gap-4 text-left transition-all ${filter === 'hidden' ? 'ring-2 ring-rose-600' : ''}`}
          >
            <div className="p-4 bg-rose-50 rounded-2xl">
              <XCircle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-rose-600">Drafts / Hidden</p>
              <h4 className="text-2xl font-black">{stats.hidden}</h4>
            </div>
          </button>
        </div>

        {/* Product Table */}
        <div className="card !p-0 overflow-hidden">
          <div className="p-6 border-b flex flex-col md:flex-row gap-4 justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5" /> 
              Product List {filter !== 'all' && <span className="capitalize text-slate-400">({filter})</span>}
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search products..."
                className="pl-10 pr-4 py-2 bg-slate-50 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-slate-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img src={product.imageUrl} className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                          <p className="font-bold text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-400 max-w-xs truncate">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      Rs. {product.price}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleStatus(product)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          product.status 
                            ? 'bg-green-50 text-green-600' 
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {product.status ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {product.status ? 'Live' : 'Hidden'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openModal(product)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button onClick={() => deleteProduct(product.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <h3 className="text-xl font-bold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-sm font-bold text-slate-700">Product Name</label>
                    <input 
                      className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-sm font-bold text-slate-700">Category</label>
                    <select 
                      className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      <option>Cake</option>
                      <option>Cookie</option>
                      <option>Pastry</option>
                      <option>Cupcake</option>
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-sm font-bold text-slate-700">Size / Weight</label>
                    <input 
                      className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="e.g. 2lbs, 8 inches"
                      value={formData.size}
                      onChange={e => setFormData({...formData, size: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-sm font-bold text-slate-700">Flavor</label>
                    <input 
                      className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="e.g. Chocolate Fudge"
                      value={formData.flavor}
                      onChange={e => setFormData({...formData, flavor: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-sm font-bold text-slate-700">Price (Rs.)</label>
                    <input 
                      type="number"
                      className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-sm font-bold text-slate-700">Initial Status</label>
                    <div className="flex gap-4 p-3 bg-slate-50 rounded-xl">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          checked={formData.status} 
                          onChange={() => setFormData({...formData, status: true})}
                        /> Live
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          checked={!formData.status} 
                          onChange={() => setFormData({...formData, status: false})}
                        /> Hidden
                      </label>
                    </div>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-bold text-slate-700">Description</label>
                    <textarea 
                      className="w-full p-3 border rounded-xl h-24 resize-none outline-none focus:ring-2 focus:ring-slate-900"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-bold text-slate-700">Product Image</label>
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-slate-100 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden">
                        {formData.imageUrl ? (
                          <img src={formData.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload}
                          className="hidden" 
                          id="image-upload" 
                        />
                        <label 
                          htmlFor="image-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <Upload className="w-4 h-4" /> 
                          {uploading ? `Uploading ${uploadProgress}%` : 'Choose File'}
                        </label>
                        <p className="text-xs text-slate-400 mt-2">Recommended: Square image, max 2MB</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-8 border-t bg-slate-50 flex gap-4">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="flex-1 py-3 border bg-white rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={uploading || saving}
                  className="flex-[2] py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
