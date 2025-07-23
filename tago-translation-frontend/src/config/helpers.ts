import { toast, type ToastOptions, type TypeOptions } from "react-toastify";

// Define the shape of user data (adjust as per your real structure)
interface User {
  language?: string;
  [key: string]: any;
}

interface UserInfo {
  token: string;
  user: User;
}

interface LanguageOption {
  code: string;
  name: string;
}

class Helpers {
  static localhost: string = "http://localhost:3000";
  static server: string = import.meta.env.VITE_API_URL;
  static ngroakUrl: string = "http://192.168.18.38:3000";

  // Set the base path dynamically depending on environment
  static basePath: string =
    window.location.origin === "http://localhost:5173"
      ? this.ngroakUrl
      : this.server;

  static baseUrl: string = `${this.server}`;
  static apiUrl: string = `${this.baseUrl}/api/v1/`;

  static localStorageTokenKey = "token";
  static localStorageUserKey = "userData";
  static defaultLanguage = "en-US";
  static authHeaders: {
    headers: {
      "Content-Type": "application/json";
      Accept: "application/json";
    };
  };
  static supportedLanguages: LanguageOption[] = [
  { code: "en-US", name: "English" },
  { code: "zh", name: "Chinese (简体中文)" },
  { code: "es", name: "Spanish (Español)" },
  { code: "hi", name: "Hindi (हिन्दी)" },
  { code: "ar", name: "Arabic (العربية)" },
  { code: "it", name: "Italian (Italiano)" },
  { code: "tr", name: "Turkish (Türkçe)" },
  { code: "nl", name: "Dutch (Nederlands)" },
  { code: "id", name: "Indonesian (Bahasa Indonesia)" },
  { code: "pl", name: "Polish (Polski)" },
  { code: "vi", name: "Vietnamese (Tiếng Việt)" },
  { code: "th", name: "Thai (ไทย)" },
  { code: "ur", name: "Urdu (اردو)" }
];

  // Add the language map as provided by the user
  static languageMap: Record<string, string> = {
    'English': 'en-US',
    'Chinese (简体中文)': 'zh',
    'Spanish (Español)': 'es',
    'Hindi (हिन्दी)': 'hi',
    'Arabic (العربية)': 'ar',
    'Italian (Italiano)': 'it',
    'Turkish (Türkçe)': 'tr',
    'Dutch (Nederlands)': 'nl',
    'Indonesian (Bahasa Indonesia)': 'id',
    'Polish (Polski)': 'pl',
    'Vietnamese (Tiếng Việt)': 'vi',
    'Thai (ไทย)': 'th',
    'Urdu (اردو)': 'ur',
  };

  // Utility to normalize a language name or code to the canonical code
  static getLanguageCode(lang: string): string {
    // If already a code in the map values, return as is
    if (Object.values(Helpers.languageMap).includes(lang)) return lang;
    // If it's a name in the map, return the code
    if (Helpers.languageMap[lang]) return Helpers.languageMap[lang];
    // Try to match supportedLanguages (for legacy)
    const found = Helpers.supportedLanguages.find(l => l.code === lang || l.name === lang);
    if (found) return found.code;
    // Fallback to input
    return lang;
  }

  static toast = (type: TypeOptions, message: string): void => {
    const options: ToastOptions = {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
    };

    switch (type) {
      case "info":
        toast.info(message, options);
        break;
      case "success":
        toast.success(message, options);
        break;
      case "warning":
        toast.warning(message, options);
        break;
      case "error":
        toast.error(message, options);
        break;
      default:
        toast(message, options);
        break;
    }
  };

  static parseJson = <T>(data: string): T => {
    return JSON.parse(data) as T;
  };

  static stringifyJson = (data: any): string => {
    return JSON.stringify(data);
  };

  static saveLocalStorage = (key: string, data: any, isJson = false): void => {
    const value = isJson ? this.stringifyJson(data) : data;
    localStorage.setItem(key, value);
  };

  static removeItemLocalStorage = (key: string): void => {
    localStorage.removeItem(key);
  };

  static getItemLocalStorage = <T = any>(
    key: string,
    isJson = false
  ): T | string | null => {
    const data = localStorage.getItem(key);
    if (!data) return null;
    return isJson ? this.parseJson<T>(data) : data;
  };

  static getToken = (): string | null => {
    return this.getItemLocalStorage<string>(this.localStorageTokenKey) as
      | string
      | null;
  };

  static token: string | null = this.getToken();
  static saveUserLocal = (userInfo: UserInfo): void => {
    const { token, user } = userInfo;
    this.saveLocalStorage(this.localStorageTokenKey, token);
    this.saveLocalStorage(this.localStorageUserKey, user, true);
  };

  static userLogout = (): void => {
    this.removeItemLocalStorage(this.localStorageTokenKey);
    this.removeItemLocalStorage(this.localStorageUserKey);
  };

  static isAuthenticated = (): boolean => {
    return !!this.getToken();
  };

  static getUserData = (): User | null => {
    const data = this.getItemLocalStorage<User>(this.localStorageUserKey, true);
    if (data && typeof data === "object") {
      return data as User;
    }
    return null;
  };

  static getUserLanguage = (): string => {
    try {
      // 1. Try user profile (userData)
      const userData = this.getUserData();
      if (userData?.language) return userData.language;
      // 2. Fallback to listenerLanguage from localStorage
      const listenerLanguage = localStorage.getItem("listenerLanguage");
      if (listenerLanguage) return listenerLanguage;
      // 3. Default
      return this.defaultLanguage;
    } catch (error) {
      console.error("Error getting user language:", error);
      return this.defaultLanguage;
    }
  };

  static blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result?.toString().split(",")[1];
        if (base64String) {
          resolve(base64String);
        } else {
          reject("Failed to convert blob to base64.");
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
}

export default Helpers;
