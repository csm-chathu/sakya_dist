import { useNavigate } from 'react-router-dom';
import { useCreateProductMutation } from '../../features/products/productsApi';
import ProductForm from '../../components/products/ProductForm';

export default function ProductCreate() {
  const navigate = useNavigate();
  const [createProduct, { isLoading }] = useCreateProductMutation();

  async function handleSubmit(data) {
    await createProduct(data).unwrap();
    navigate('/products');
  }

  return (
    <div className="p-3 sm:p-6 space-y-3">
      <ProductForm onSubmit={handleSubmit} isSaving={isLoading} />
    </div>
  );
}
