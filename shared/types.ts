export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  size: string;
  flavor: string;
  imageUrl: string;
  status: boolean; // true for live, false for hidden
  createdAt: any; // Firebase Timestamp
}


export type Category = 'Cake' | 'Cookie' | 'Pastry' | 'Cupcake';

export interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
}

export interface CheckoutForm {
  customerName: string;
  customerPhone: string;
  address: string;
  deliveryDate: string;
  deliveryTime: string;
}
