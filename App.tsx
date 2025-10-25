import React, { useState, useCallback } from 'react';
import { generatePoster, generateSymbolImage } from './services/geminiService';
import { fileToBase64, getMimeType } from './utils/fileUtils';
import ImageUploader from './components/ImageUploader';
import TextInput from './components/TextInput';
import Button from './components/Button';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [selectedFont, setSelectedFont] = useState<string>('Cairo');
  const [generatedPosters, setGeneratedPosters] = useState<string[] | null>(null);
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null);
  const [symbolImageUrl, setSymbolImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (file: File | null) => {
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setGeneratedPosters(null);
      setSelectedPoster(null);
      setSymbolImageUrl(null);
      setError(null);
    }
  };

  const handleGenerateClick = useCallback(async () => {
    if (!imageFile || !name || !symbol || !district) {
      setError('Please fill all fields: photo, name, symbol, and district.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedPosters(null);
    setSelectedPoster(null);
    setSymbolImageUrl(null);

    try {
      const base64Data = await fileToBase64(imageFile);
      const mimeType = getMimeType(imageFile.name) || 'image/jpeg';
      
      const [posterResults, symbolImageResult] = await Promise.all([
        generatePoster({ data: base64Data, mimeType }),
        generateSymbolImage(symbol)
      ]);

      if (posterResults && posterResults.length > 0) {
        setGeneratedPosters(posterResults);
        setSelectedPoster(posterResults[0]); 
      } else {
        throw new Error('The AI model did not return any poster images. Please try again.');
      }

      if (symbolImageResult) {
        setSymbolImageUrl(symbolImageResult);
      } else {
        throw new Error('The AI model failed to generate an icon for the symbol.');
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, name, symbol, district]);
  
  const handleDownload = () => {
    if (!selectedPoster || !symbolImageUrl) return;

    setIsDownloading(true);
    setError(null);

    const posterImage = new Image();
    posterImage.crossOrigin = 'anonymous';
    posterImage.src = selectedPoster;

    posterImage.onload = () => {
        const symbolImage = new Image();
        symbolImage.crossOrigin = 'anonymous';
        symbolImage.src = symbolImageUrl;

        symbolImage.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = 1500 / posterImage.width; // Upscale for better quality
            canvas.width = 1500;
            canvas.height = posterImage.height * scale;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                setError('Could not create canvas context for download.');
                setIsDownloading(false);
                return;
            }

            // 1. Draw poster
            ctx.drawImage(posterImage, 0, 0, canvas.width, canvas.height);
            
            // Text Shadow for integration
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            // 2. Draw candidate's name
            const nameFontSize = canvas.width / 14;
            ctx.font = `900 ${nameFontSize}px ${selectedFont}`;
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.direction = 'rtl';
            const nameY = canvas.height * 0.82;
            ctx.fillText(name, canvas.width / 2, nameY);

            // 3. Draw district text
            const districtText = `مرشح عن دائرة ${district}`;
            const districtFontSize = canvas.width / 35;
            ctx.font = `700 ${districtFontSize}px ${selectedFont}`;
            ctx.fillStyle = '#FFFFFF';
            const districtY = nameY + nameFontSize / 2;
            ctx.fillText(districtText, canvas.width / 2, districtY);

            // Reset shadow for the symbol image
            ctx.shadowColor = 'transparent';

            // 4. Draw symbol image
            const symbolSize = canvas.width / 9;
            const symbolX = canvas.width / 2 - symbolSize / 2;
            const symbolY = districtY + districtFontSize;
            ctx.drawImage(symbolImage, symbolX, symbolY, symbolSize, symbolSize);

            // 5. Trigger download
            const link = document.createElement('a');
            link.download = 'my-election-poster.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            setIsDownloading(false);
        };
        
        symbolImage.onerror = () => {
            setError("Could not load symbol icon to create download file.");
            setIsDownloading(false);
        };
    };

    posterImage.onerror = () => {
      setError("Could not load poster image to create download file.");
      setIsDownloading(false);
    };
  };


  const handleReset = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setName('');
    setSymbol('');
    setDistrict('');
    setGeneratedPosters(null);
    setSelectedPoster(null);
    setSymbolImageUrl(null);
    setError(null);
    setIsLoading(false);
  }

  const isFormComplete = !!imageFile && !!name && !!symbol && !!district;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800">
            صانع الملصقات الانتخابية
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            صمم ملصق حملتك الانتخابية بضغطة زر
          </p>
        </header>

        <main className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Input Section */}
            <div className="p-8 space-y-6 border-b lg:border-b-0 lg:border-r border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="bg-red-600 text-white rounded-full h-8 w-8 flex items-center justify-center text-lg ml-3">1</span>
                  ارفع صورتك الشخصية
                </h2>
                <ImageUploader onImageChange={handleImageChange} previewUrl={previewUrl} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="bg-red-600 text-white rounded-full h-8 w-8 flex items-center justify-center text-lg ml-3">2</span>
                  أدخل بياناتك
                </h2>
                 <div className="space-y-4">
                    <TextInput
                        label="الاسم الكامل"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثال: محمد عبدالله"
                    />
                    <TextInput
                        label="الدائرة الانتخابية"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="مثال: دائرة المعادي"
                    />
                    <TextInput
                        label="الرمز الانتخابي"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        placeholder="مثال: نخلة، أسد، مفتاح"
                    />
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">اختر الخط</label>
                        <select 
                            value={selectedFont} 
                            onChange={(e) => setSelectedFont(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                        >
                            <option value="Cairo">Cairo (كايرو)</option>
                            <option value="Alexandria">Alexandria (الإسكندرية)</option>
                            <option value="Tajawal">Tajawal (تجوال)</option>
                        </select>
                    </div>
                 </div>
              </div>
              <div className="pt-4">
                 <Button onClick={handleGenerateClick} disabled={!isFormComplete || isLoading}>
                    {isLoading ? 'جاري التصميم...' : 'صمم الملصقات الآن'}
                </Button>
                {generatedPosters && (
                    <button onClick={handleReset} className="w-full mt-4 text-center text-gray-500 hover:text-gray-700 transition-colors">
                        البدء من جديد
                    </button>
                )}
              </div>
            </div>

            {/* Output Section */}
            <div className="p-8 flex flex-col items-center justify-center bg-gray-50 min-h-[400px]">
              {isLoading && <Spinner />}
              {!isLoading && error && (
                <div className="text-center text-red-600 bg-red-100 p-4 rounded-lg">
                  <p className="font-bold">حدث خطأ</p>
                  <p>{error}</p>
                </div>
              )}
              {!isLoading && !error && generatedPosters && selectedPoster && (
                <div className="w-full text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">ملصقاتك جاهزة! اختر المفضل لديك</h2>
                    
                    <div className="mb-4 relative">
                      <img src={selectedPoster} alt="Selected Election Poster" className="rounded-lg shadow-lg mx-auto max-w-full h-auto" />
                      <div className="absolute bottom-0 w-full text-center p-4 flex flex-col items-center justify-end h-1/3">
                          <h3 className="text-3xl md:text-5xl font-black text-white" style={{ fontFamily: selectedFont, textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>{name}</h3>
                          <p className="text-sm md:text-lg font-bold text-white mt-1" style={{ fontFamily: selectedFont, textShadow: '1px 1px 6px rgba(0,0,0,0.7)' }}>مرشح عن دائرة {district}</p>
                          {symbolImageUrl && (
                            <img 
                                src={symbolImageUrl} 
                                alt={symbol} 
                                className="mt-2 w-14 h-14 md:w-20 md:h-20 object-contain drop-shadow-lg"
                            />
                          )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-6">
                      {generatedPosters.map((poster, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedPoster(poster)}
                          className={`rounded-md overflow-hidden border-4 ${selectedPoster === poster ? 'border-red-600' : 'border-transparent'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all`}
                        >
                          <img src={poster} alt={`Poster option ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="mt-6 inline-block w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 disabled:bg-gray-400"
                    >
                        {isDownloading ? 'جاري التحميل...' : 'تحميل الملصق المختار'}
                    </button>
                </div>
              )}
               {!isLoading && !error && !generatedPosters && (
                <div className="text-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-20 w-20 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-4 text-lg">ستظهر نتيجة التصميم هنا</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;