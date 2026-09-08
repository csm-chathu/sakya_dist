import { useNavigate, useParams } from 'react-router-dom';
import { useGetProductQuery, useUpdateProductMutation } from '../../features/products/productsApi';
import ProductForm from '../../components/products/ProductForm';
import { useLocale } from '../../contexts/LocaleContext';

export default function ProductEdit() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { t }     = useLocale();

  const { data: product, isLoading } = useGetProductQuery(id);
  const [updateProduct, { isLoading: isSaving }] = useUpdateProductMutation();

  async function handleSubmit(data) {
    await updateProduct({ id, ...data }).unwrap();
    navigate('/products');
  }

  if (isLoading) return <div className="p-6 text-slate-500">{t('lbl.loading')}</div>;
  if (!product) return <div className="p-6 text-slate-500">{t('prod.no_products')}</div>;

  return (
    <div className="p-3 sm:p-6 space-y-3">
      <ProductForm
        initial={product}
        onSubmit={handleSubmit}
        isSaving={isSaving}
      />
    </div>
  );
}
