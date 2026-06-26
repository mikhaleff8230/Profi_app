import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { toast } from 'react-toastify';
import { HttpClient } from '@/data/client/http-client';
import { useMeQuery, useUsersQuery } from '@/data/user';
import { Routes } from '@/config/routes';
import Cookies from 'js-cookie';
import Layout from '@/components/layouts/admin';
import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import TextArea from '@/components/ui/text-area';
import Loader from '@/components/ui/loader/loader';
import ErrorMessage from '@/components/ui/error-message';
import Image from 'next/image';
import HashtagAutocomplete from '@/components/places/HashtagAutocomplete';
import Search from '@/components/common/search';
import { Table } from '@/components/ui/table';

interface User {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
}

interface PlacePreview {
  title: string;
  description: string;
  image?: string;
  imageName?: string;
  source_url?: string;
  hashtags: Array<{ id?: string; name: string } | string>;
}

export default function PlaceImportPage() {
  const router = useRouter();
  
  const AUTH_TOKEN_KEY = process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY ?? 'authToken';
  const authToken = Cookies.get(AUTH_TOKEN_KEY);
  
  useEffect(() => {
    if (!authToken) {
      router.replace(Routes.login);
    }
  }, [authToken, router]);
  
  if (!authToken) {
    return null;
  }
  
  return <PlaceImportPageContent />;
}

function PlaceImportPageContent() {
  const { t } = useTranslation();
  const { data: me, isLoading: meLoading } = useMeQuery();
  
  // Поля для массового ввода
  const [titlesText, setTitlesText] = useState('');
  const [descriptionsText, setDescriptionsText] = useState('');
  const [urlsText, setUrlsText] = useState('');
  const [imagesFolder, setImagesFolder] = useState('/var/www/sancan.ru/product-parser/foto'); // Папка с изображениями по умолчанию
  
  // Поиск пользователя
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPage, setUserPage] = useState(1);
  
  // Используем тот же хук, что и на странице /users
  const { users, loading: usersLoading } = useUsersQuery({
    limit: 20,
    page: userPage,
    name: userSearchTerm,
  });
  
  // Сгенерированные плейсы
  const [placesPreview, setPlacesPreview] = useState<PlacePreview[]>([]);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Создание плейсов
  const [isCreating, setIsCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState({ current: 0, total: 0 });
  
  const handleUserSearch = ({ searchText }: { searchText: string }) => {
    setUserSearchTerm(searchText);
    setUserPage(1);
  };
  
  // Загрузка списка изображений из папки
  const loadImages = async () => {
    if (!imagesFolder.trim()) {
      return;
    }
    
    try {
      const response = await HttpClient.post<any>('/place-parser/list-images', {
        folder: imagesFolder.trim(),
      });
      
      if (response?.success && response?.data) {
        setAvailableImages(response.data);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки изображений:', error);
      toast.error('Ошибка загрузки списка изображений');
    }
  };
  
  // Генерация списка плейсов
  const handleGenerate = () => {
    const titles = titlesText.split('\n').filter(t => t.trim()).map(t => t.trim());
    const descriptions = descriptionsText.split('\n').filter(d => d.trim()).map(d => d.trim());
    const urls = urlsText.split('\n').filter(u => u.trim()).map(u => u.trim());
    
    if (titles.length === 0) {
      toast.error('Введите хотя бы один заголовок');
      return;
    }
    
    if (descriptions.length === 0) {
      toast.error('Введите хотя бы одно описание');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const places: PlacePreview[] = [];
      const maxCount = Math.max(titles.length, descriptions.length);
      
      for (let i = 0; i < maxCount; i++) {
        const title = titles[i] || titles[0];
        const description = descriptions[i] || descriptions[0];
        const sourceUrl = urls[i] || urls[0] || undefined;
        
        // Ищем изображение по названию (поиск по части названия в имени файла)
        let matchedImage: string | undefined;
        const titleLower = title.toLowerCase();
        
        for (const img of availableImages) {
          const imgName = img.toLowerCase();
          // Проверяем, содержит ли имя файла часть заголовка
          if (imgName.includes(titleLower.substring(0, 10)) || titleLower.includes(imgName.substring(0, 10))) {
            matchedImage = img;
            break;
          }
        }
        
        // Если не нашли, берем по индексу
        if (!matchedImage && availableImages.length > 0) {
          matchedImage = availableImages[i % availableImages.length];
        }
        
        places.push({
          title,
          description,
          image: matchedImage,
          imageName: matchedImage ? matchedImage.split('/').pop() : undefined,
          source_url: sourceUrl,
          hashtags: [],
        });
      }
      
      setPlacesPreview(places);
      toast.success(`Сгенерировано ${places.length} плейсов`);
    } catch (error: any) {
      console.error('Ошибка генерации:', error);
      toast.error('Ошибка генерации списка плейсов');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Обновление хештегов для конкретного плейса
  const handleHashtagsChange = (index: number, hashtags: Array<{ id?: string; name: string } | string>) => {
    const updated = [...placesPreview];
    updated[index].hashtags = hashtags;
    setPlacesPreview(updated);
  };
  
  // Массовое создание плейсов
  const handleCreateAll = async () => {
    if (!selectedUser) {
      toast.error('Выберите пользователя');
      return;
    }
    
    if (placesPreview.length === 0) {
      toast.error('Нет плейсов для создания');
      return;
    }
    
    setIsCreating(true);
    setCreateProgress({ current: 0, total: placesPreview.length });
    
    try {
      const response = await HttpClient.post<any>('/place-parser/create-bulk', {
        places: placesPreview.map(p => ({
          title: p.title,
          description: p.description,
          source_url: p.source_url,
          image: p.image,
          hashtags: p.hashtags.map(t => typeof t === 'string' ? t : t.name),
        })),
        user_id: selectedUser.id,
      });
      
      if (response?.success) {
        toast.success(`Успешно создано ${response.data?.created || placesPreview.length} плейсов`);
        // Очищаем форму
        setTitlesText('');
        setDescriptionsText('');
        setUrlsText('');
        setPlacesPreview([]);
      } else {
        throw new Error(response?.message || 'Ошибка при создании плейсов');
      }
    } catch (error: any) {
      console.error('Ошибка создания плейсов:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Ошибка при создании плейсов';
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
      setCreateProgress({ current: 0, total: 0 });
    }
  };
  
  if (meLoading) {
    return <Loader text={t('common:text-loading')} />;
  }
  
  return (
    <>
      <Card className="mb-5">
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-heading">
            Массовое создание плейсов
          </h1>
        </div>
        
        {/* Поле выбора пользователя */}
        <div className="mb-4">
          <Label>Пользователь *</Label>
          <div className="mt-2">
            <Search
              onSearch={handleUserSearch}
              placeholderText="Поиск по имени, email..."
            />
          </div>
          
          {selectedUser && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
              <div className="text-sm">
                <strong>Выбран:</strong> {selectedUser.name} ({selectedUser.email})
              </div>
              <Button
                size="small"
                onClick={() => {
                  setSelectedUser(null);
                  setUserSearchTerm('');
                }}
                className="mt-2"
              >
                Отменить выбор
              </Button>
            </div>
          )}
          
          {!selectedUser && userSearchTerm && (
            <div className="mt-4">
              {usersLoading ? (
                <Loader text="Поиск пользователей..." />
              ) : users && users.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table
                    columns={[
                      {
                        title: 'Имя',
                        dataIndex: 'name',
                        key: 'name',
                      },
                      {
                        title: 'Email',
                        dataIndex: 'email',
                        key: 'email',
                      },
                      {
                        title: 'Действие',
                        dataIndex: 'id',
                        key: 'action',
                        render: (id: string, record: User) => (
                          <Button
                            size="small"
                            onClick={() => setSelectedUser(record)}
                          >
                            Выбрать
                          </Button>
                        ),
                      },
                    ]}
                    data={users}
                    rowKey="id"
                    emptyText="Пользователи не найдены"
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-500">Пользователи не найдены</p>
              )}
            </div>
          )}
        </div>
        
        {/* Поле для папки с изображениями */}
        <div className="mb-4">
          <Label>Путь к папке с изображениями</Label>
          <div className="flex gap-2 mt-2">
            <Input
              type="text"
              value={imagesFolder}
              onChange={(e) => setImagesFolder(e.target.value)}
              placeholder="/path/to/images/folder"
              className="flex-1"
            />
            <Button onClick={loadImages} disabled={!imagesFolder.trim()}>
              Загрузить список
            </Button>
          </div>
          {availableImages.length > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              Загружено изображений: {availableImages.length}
            </p>
          )}
        </div>
        
        {/* Поле для заголовков */}
        <div className="mb-4">
          <Label>Заголовки (каждая строка = один заголовок, до 100 штук) *</Label>
          <TextArea
            value={titlesText}
            onChange={(e) => setTitlesText(e.target.value)}
            placeholder="Заголовок 1&#10;Заголовок 2&#10;Заголовок 3&#10;..."
            rows={6}
            className="mt-1 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Количество строк: {titlesText.split('\n').filter(t => t.trim()).length}
          </p>
        </div>
        
        {/* Поле для описаний */}
        <div className="mb-4">
          <Label>Описания (каждая строка = одно описание) *</Label>
          <TextArea
            value={descriptionsText}
            onChange={(e) => setDescriptionsText(e.target.value)}
            placeholder="Описание 1&#10;Описание 2&#10;Описание 3&#10;..."
            rows={6}
            className="mt-1 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Количество строк: {descriptionsText.split('\n').filter(d => d.trim()).length}
          </p>
        </div>
        
        {/* Поле для URL (необязательно) */}
        <div className="mb-4">
          <Label>URL источников (необязательно, каждая строка = один URL)</Label>
          <TextArea
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder="https://example.com/1&#10;https://example.com/2&#10;..."
            rows={4}
            className="mt-1 font-mono text-sm"
          />
        </div>
        
        {/* Кнопка генерации */}
        <div className="mb-4">
          <Button
            onClick={handleGenerate}
            disabled={!titlesText.trim() || !descriptionsText.trim() || isGenerating}
            loading={isGenerating}
            className="w-full"
          >
            {isGenerating ? 'Генерация...' : 'Генерировать список плейсов'}
          </Button>
        </div>
      </Card>
      
      {/* Предпросмотр списка плейсов */}
      {placesPreview.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Предпросмотр плейсов ({placesPreview.length})
            </h2>
            <Button
              onClick={handleCreateAll}
              disabled={!selectedUser || isCreating}
              loading={isCreating}
            >
              {isCreating 
                ? `Создание... ${createProgress.current}/${createProgress.total}` 
                : `Создать все (${placesPreview.length})`}
            </Button>
          </div>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {placesPreview.map((place, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Фото-превью */}
                  <div className="relative w-full h-32 bg-gray-200 rounded overflow-hidden">
                    {place.image ? (
                      <Image
                        src={place.image}
                        alt={place.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        Нет фото
                      </div>
                    )}
                  </div>
                  
                  {/* Информация о плейсе */}
                  <div className="md:col-span-2">
                    <h3 className="font-semibold mb-1">{place.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {place.description}
                    </p>
                    {place.imageName && (
                      <p className="text-xs text-gray-400">Фото: {place.imageName}</p>
                    )}
                    {place.source_url && (
                      <p className="text-xs text-gray-400 truncate">
                        URL: {place.source_url}
                      </p>
                    )}
                  </div>
                  
                  {/* Поле для хештегов */}
                  <div>
                    <Label className="text-xs">Хештеги</Label>
                    <HashtagAutocomplete
                      value={place.hashtags}
                      onChange={(hashtags) => handleHashtagsChange(index, hashtags)}
                      maxTags={10}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

PlaceImportPage.Layout = Layout;

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'form'])),
  },
});
