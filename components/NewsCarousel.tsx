import React, { useState, useEffect, useCallback } from 'react';
import { NewsBanner } from '../types';
import * as db from '../services/db';

interface NewsCarouselProps {
    banners: NewsBanner[];
}

const NewsCarousel: React.FC<NewsCarouselProps> = ({ banners }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [images, setImages] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchImages = async () => {
            setIsLoading(true);
            const imageMap: { [key: string]: string } = {};
            for (const banner of banners) {
                try {
                    const data = await db.getMaterialData(banner.imageId);
                    if (data) {
                        imageMap[banner.imageId] = data;
                    }
                } catch (error) {
                    console.error(`Failed to load image for banner ${banner.id}`, error);
                }
            }
            setImages(imageMap);
            setIsLoading(false);
        };

        if (banners.length > 0) {
            fetchImages();
        } else {
            setIsLoading(false);
        }
    }, [banners]);

    const goToPrevious = useCallback(() => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? banners.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    }, [currentIndex, banners.length]);

    const goToNext = useCallback(() => {
        const isLastSlide = currentIndex === banners.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    }, [currentIndex, banners.length]);

    const goToSlide = (slideIndex: number) => {
        setCurrentIndex(slideIndex);
    };

    useEffect(() => {
        if (banners.length > 1) {
            const timer = setTimeout(goToNext, 7000);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, banners.length, goToNext]);

    if (isLoading) {
        return (
            <div className="w-full aspect-video bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse flex items-center justify-center">
                <p className="text-slate-500">در حال بارگذاری بنرها...</p>
            </div>
        );
    }
    
    if (banners.length === 0) {
        return null;
    }

    const currentBanner = banners[currentIndex];
    const currentImage = images[currentBanner.imageId];

    return (
        <div className="rounded-2xl overflow-hidden shadow-lg bg-white dark:bg-slate-800">
            {/* Image Section */}
            <div className="relative w-full aspect-video group bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                {/* Image */}
                {currentImage ? (
                     <img
                        key={currentIndex}
                        src={currentImage}
                        alt={currentBanner.title}
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <p className="text-slate-500">تصویر در دسترس نیست</p>
                )}
           
                {/* Navigation Buttons */}
                {banners.length > 1 && (
                    <>
                        <button 
                            onClick={goToPrevious} 
                            className="absolute top-1/2 -translate-y-1/2 left-4 bg-black/30 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/50 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
                            aria-label="Previous Slide"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                        </button>
                        <button 
                            onClick={goToNext} 
                            className="absolute top-1/2 -translate-y-1/2 right-4 bg-black/30 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/50 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
                            aria-label="Next Slide"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                        </button>
                    </>
                )}

                {/* Dot Indicators */}
                 {banners.length > 1 && (
                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                        {banners.map((_, slideIndex) => (
                            <button
                                key={slideIndex}
                                onClick={() => goToSlide(slideIndex)}
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 transform ${currentIndex === slideIndex ? 'bg-cyan-400 scale-125' : 'bg-white/50 hover:bg-white/75'}`}
                                aria-label={`Go to slide ${slideIndex + 1}`}
                            ></button>
                        ))}
                    </div>
                )}
            </div>
            {/* Text Content Section */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{currentBanner.title}</h3>
                {currentBanner.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{currentBanner.description}</p>}
            </div>
        </div>
    );
};

export default NewsCarousel;