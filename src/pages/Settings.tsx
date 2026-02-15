
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Monitor } from 'lucide-react';

export default function Settings() {
    const { t, i18n } = useTranslation();
    const { theme, setTheme } = useTheme();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
                
                {/* Language Section */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.language')}</h3>
                    <div className="flex space-x-4">
                        <button
                            onClick={() => changeLanguage('en')}
                            className={`px-4 py-2 rounded-md ${
                                i18n.language === 'en' 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            English
                        </button>
                        <button
                            onClick={() => changeLanguage('uk')}
                            className={`px-4 py-2 rounded-md ${
                                i18n.language === 'uk' 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            Українська
                        </button>
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700"></div>

                {/* Theme Section */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.theme')}</h3>
                    <div className="grid grid-cols-3 gap-4 sm:max-w-md">
                        <button
                            onClick={() => setTheme('light')}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 ${
                                theme === 'light'
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                    : 'border-transparent bg-gray-100 dark:bg-gray-700'
                            }`}
                        >
                            <Sun className={`h-6 w-6 mb-2 ${theme === 'light' ? 'text-indigo-600' : 'text-gray-500'}`} />
                            <span className={`text-sm ${theme === 'light' ? 'text-indigo-900 font-medium' : 'text-gray-500'}`}>
                                {t('settings.light')}
                            </span>
                        </button>

                        <button
                            onClick={() => setTheme('dark')}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 ${
                                theme === 'dark'
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                    : 'border-transparent bg-gray-100 dark:bg-gray-700'
                            }`}
                        >
                            <Moon className={`h-6 w-6 mb-2 ${theme === 'dark' ? 'text-indigo-600' : 'text-gray-500'}`} />
                            <span className={`text-sm ${theme === 'dark' ? 'text-indigo-900 font-medium' : 'text-gray-500'}`}>
                                {t('settings.dark')}
                            </span>
                        </button>

                        <button
                            onClick={() => setTheme('system')}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 ${
                                theme === 'system'
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                    : 'border-transparent bg-gray-100 dark:bg-gray-700'
                            }`}
                        >
                            <Monitor className={`h-6 w-6 mb-2 ${theme === 'system' ? 'text-indigo-600' : 'text-gray-500'}`} />
                            <span className={`text-sm ${theme === 'system' ? 'text-indigo-900 font-medium' : 'text-gray-500'}`}>
                                {t('settings.system')}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
