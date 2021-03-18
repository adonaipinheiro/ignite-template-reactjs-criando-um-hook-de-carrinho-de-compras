import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
       return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let cartListParsed: Product[];
      const cartList = localStorage.getItem('@RocketShoes:cart');
      const productData = await (await api.get(`products/${productId}`)).data;
      const productAmountInStock: Stock = await (await api.get(`stock/${productId}`)).data;

      if (cartList) {
        cartListParsed = JSON.parse(cartList);
        const itemId = cartListParsed.findIndex(item => item.id === productId);
        if (itemId < 0) {
          cartListParsed.push({
            ...productData, amount: 1
          })
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartListParsed))
          setCart(cartListParsed);
        } else if (itemId >= 0 && (productAmountInStock.amount > cartListParsed[itemId].amount)) {
          cartListParsed[itemId] = {
            ...cartListParsed[itemId],
            amount: cartListParsed[itemId].amount + 1,
          }
          setCart(cartListParsed);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartListParsed))
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      } else {
        setCart([{...productData, amount: 1}]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([{...productData, amount: 1}]))
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let cartListParsed: Product[];
      const cartList = localStorage.getItem('@RocketShoes:cart');
      if (cartList) {
        cartListParsed = JSON.parse(cartList);
        const itemId = cartListParsed.findIndex(product => product.id === productId);
        if (itemId >= 0) {
          cartListParsed.splice(itemId, 1);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartListParsed));
          setCart(cartListParsed);
        }
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      let cartListParsed: Product[];
      const cartList = localStorage.getItem('@RocketShoes:cart');
      const productAmountInStock: Stock = await (await api.get(`stock/${productId}`)).data;

      if (cartList) {
        cartListParsed = JSON.parse(cartList);
        const itemId = cartListParsed.findIndex(product => product.id === productId);
        if (itemId >= 0 && cartListParsed[itemId].amount < productAmountInStock.amount) {
          cartListParsed[itemId] = {
            ...cartListParsed[itemId],
            amount: cartListParsed[itemId].amount + (amount)
          }
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartListParsed));
          setCart(cartListParsed);
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
