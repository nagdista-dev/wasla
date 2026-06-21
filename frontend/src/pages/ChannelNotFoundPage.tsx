import { useLanguage } from '../context/LanguageContext';
import ErrorPage from '../components/ErrorPage';

export default function ChannelNotFoundPage() {
  const { t } = useLanguage();
  return (
    <ErrorPage
      type="NOT_FOUND"
      title={t('error.channelNotFound.title')}
      description={t('error.channelNotFound.description')}
    />
  );
}
