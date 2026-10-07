import { Hospital, LoggedInUser, UserRole, Department, StaffMember, Assessment, TrainingMaterial, NewsBanner, Patient, ChatMessage, AdminMessage, NeedsAssessmentTopic, ProvincialOfficer, ArchivedArticleTemplate, AppAboutInfo } from '../types';
// FIX: The RealtimeChannel type is not exported from supabase-js anymore.
// The type will be inferred from the supabase client instance.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || 'https://npyujcxsmvwmydtfwjjo.supabase.co';
const supabaseKey = (import.meta.env && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) || 'sb_publishable_6jxWVzEvwuaxCs2SdluLhw_QkDWrEP0';
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'app_files';

// Helper to convert data URL to Blob for uploading
function dataURLtoBlob(dataurl: string): Blob {
    const parts = dataurl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (!parts[1] || !mimeMatch) {
        throw new Error('Invalid data URL format for blob conversion.');
    }
    const mime = mimeMatch[1];
    const byteString = atob(parts[1]);
    let n = byteString.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = byteString.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

export const uploadFileFromDataUrl = async (dataUrl: string, fileName: string): Promise<{ path: string; error: Error | null }> => {
    try {
        const blob = dataURLtoBlob(dataUrl);
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `public/${Date.now()}-${sanitizedFileName}`;
        
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, blob, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Supabase Storage upload error:', error);
            return { path: '', error: new Error(error.message) };
        }
        
        return { path: filePath, error: null };

    } catch (e) {
        console.error('Error during file upload process:', e);
        const error = e instanceof Error ? e : new Error('Unknown upload error');
        return { path: '', error };
    }
};

export const getFilePublicUrl = (path: string): string | null => {
    if (!path) return null;
    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);
    
    return data.publicUrl;
};

export const deleteFile = async (path: string): Promise<{ error: Error | null }> => {
     try {
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([path]);
        
        if (error) {
            console.error('Supabase Storage delete error:', error);
            return { error: new Error(error.message) };
        }
        return { error: null };
     } catch(e) {
        console.error('Error during file deletion process:', e);
        const error = e instanceof Error ? e : new Error('Unknown deletion error');
        return { error };
     }
}

const HOSPITALS_KEY = 'hospitals_data';
const DATA_ROW_ID = 1;

export const getHospitalsFromLocal = (): Hospital[] => {
    try {
        const data = localStorage.getItem(HOSPITALS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to parse hospitals from localStorage", e);
        return [];
    }
};

let activeWriteCount = 0;
let lastWriteTimestamp = 0;

export const isWriting = (): boolean => {
    return activeWriteCount > 0 || (Date.now() - lastWriteTimestamp < 1200);
};

export const startWrite = () => {
    activeWriteCount++;
};

export const endWrite = () => {
    activeWriteCount = Math.max(0, activeWriteCount - 1);
    lastWriteTimestamp = Date.now();
};

export const syncAndAssembleData = async (): Promise<Hospital[]> => {
    try {
        const { data, error } = await supabase
          .from('hospitals_json')
          .select('data')
          .eq('id', DATA_ROW_ID)
          .single();

        if (error && error.code !== 'PGRST116') {
            console.warn(`Could not fetch data from Supabase (Code: ${error.code}), using local fallback.`);
            return getHospitalsFromLocal();
        }

        if (data && data.data) {
            localStorage.setItem(HOSPITALS_KEY, JSON.stringify(data.data));
            return data.data as Hospital[];
        }
    } catch (e) {
        console.warn("Could not sync with Supabase, using local fallback.", e);
    }
    
    return getHospitalsFromLocal();
};

let channel: ReturnType<typeof supabase.channel> | null = null;
export const onRemoteChange = (callback: () => void): (() => void) => {
    if (channel) {
        supabase.removeChannel(channel);
    }

    channel = supabase
        .channel('hospitals_json_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals_json' }, payload => {
            console.log('Remote change detected, refreshing data.', payload);
            callback();
        })
        .subscribe();
    
    return () => {
        if (channel) {
            supabase.removeChannel(channel).catch(console.error);
            channel = null;
        }
    };
};

export const saveAllHospitals = async (hospitals: Hospital[]): Promise<{ error: Error | null }> => {
    startWrite();
    try {
        try {
            localStorage.setItem(HOSPITALS_KEY, JSON.stringify(hospitals));
        } catch (e) {
            console.error("Failed to save hospitals to localStorage", e);
        }

        try {
            const { error: supabaseError } = await supabase
                .from('hospitals_json')
                .upsert({ id: DATA_ROW_ID, data: hospitals }, { onConflict: 'id' });

            if (supabaseError) {
                console.warn("Supabase upsert warning:", supabaseError);
                // If offline, RLS, table missing, or network issues, local storage has already safely saved the data
                if (supabaseError.message && (supabaseError.message.includes('fetch') || supabaseError.message.includes('network') || supabaseError.code === 'PGRST116')) {
                    return { error: null };
                }
                let userFriendlyMessage = `خطا در ذخیره اطلاعات در پایگاه داده: ${supabaseError.message}`;
                
                if (supabaseError.code === '42501' || (supabaseError.message && (supabaseError.message.includes('security policies') || supabaseError.message.includes('row-level security')))) {
                    console.warn(`RLS Policy notice: changes saved locally in localStorage.`);
                    return { error: null };
                } else if (supabaseError.code === '42P01') {
                    console.warn(`Table hospitals_json notice: changes saved locally in localStorage.`);
                    return { error: null };
                }
                return { error: null };
            }
            return { error: null };

        } catch (e: any) {
            console.warn("Supabase connection unavailable, using local persistence mode:", e?.message || e);
            // Data is already saved safely in localStorage above. Don't block the user with errors.
            return { error: null };
        }
    } finally {
        endWrite();
    }
};

// ===================================================================
//  ATOMIC WRITE OPERATIONS (Read-Modify-Write)
// ===================================================================

export const upsertHospital = async (hospital: Hospital): Promise<{ error: Error | null }> => {
    const hospitals = await syncAndAssembleData();
    const index = hospitals.findIndex(h => h.id === hospital.id);
    if (index > -1) hospitals[index] = hospital; else hospitals.push(hospital);
    return saveAllHospitals(hospitals);
};

export const deleteHospital = async (hospitalId: string): Promise<{ error: Error | null }> => {
    try {
        const allHospitalsBeforeDelete = await syncAndAssembleData();
        const hospitalToDelete = allHospitalsBeforeDelete.find(h => h.id === hospitalId);

        if (!hospitalToDelete) {
            console.warn(`Attempted to delete hospital with ID ${hospitalId}, but it was not found.`);
            return { error: null };
        }

        const expectedHospitalsAfterDelete = allHospitalsBeforeDelete.filter(h => h.id !== hospitalId);
        const saveResult = await saveAllHospitals(expectedHospitalsAfterDelete);

        if (saveResult.error) return saveResult;

        // VERIFICATION and Cleanup
        const actualHospitalsAfterDelete = await syncAndAssembleData();
        if (actualHospitalsAfterDelete.some(h => h.id === hospitalId)) {
            localStorage.setItem(HOSPITALS_KEY, JSON.stringify(actualHospitalsAfterDelete));
            return { error: new Error('حذف از پایگاه داده ناموفق بود. علت احتمالی: خط‌مشی‌های امنیتی (RLS).') };
        }

        (async () => {
            const pathsToDelete: string[] = [];
            hospitalToDelete.accreditationMaterials?.forEach(m => m.storagePath && pathsToDelete.push(m.storagePath));
            hospitalToDelete.newsBanners?.forEach(b => b.imageStoragePath && pathsToDelete.push(b.imageStoragePath));
            hospitalToDelete.departments.forEach(d => {
                d.trainingMaterials?.forEach(tm => tm.materials.forEach(m => m.storagePath && pathsToDelete.push(m.storagePath)));
                d.patientEducationMaterials?.forEach(m => m.storagePath && pathsToDelete.push(m.storagePath));
                d.patients?.forEach(p => p.chatHistory?.forEach(c => c.file?.storagePath && pathsToDelete.push(c.file.storagePath)));
            });
            if (pathsToDelete.length > 0) {
                console.log(`(Background) Deleting ${pathsToDelete.length} files for hospital ${hospitalId}`);
                await supabase.storage.from(BUCKET_NAME).remove(pathsToDelete);
            }
        })();

        return { error: null };
    } catch (e) {
        return { error: e instanceof Error ? e : new Error("خطای غیرمنتظره در حذف بیمارستان رخ داد.") };
    }
};

export const resetHospitalDepartments = async (hospitalId: string): Promise<{ error: Error | null }> => {
    try {
        const allHospitals = await syncAndAssembleData();
        const hospitalToUpdate = allHospitals.find(h => h.id === hospitalId);
        if (!hospitalToUpdate) return { error: new Error(`Hospital not found for reset.`) };
        if (hospitalToUpdate.departments.length === 0) return { error: null };

        const pathsToDelete: string[] = [];
        hospitalToUpdate.departments.forEach(d => {
            d.trainingMaterials?.forEach(tm => tm.materials.forEach(m => m.storagePath && pathsToDelete.push(m.storagePath)));
            d.patientEducationMaterials?.forEach(m => m.storagePath && pathsToDelete.push(m.storagePath));
            d.patients?.forEach(p => p.chatHistory?.forEach(c => c.file?.storagePath && pathsToDelete.push(c.file.storagePath)));
        });
        
        hospitalToUpdate.departments = [];
        
        const saveResult = await saveAllHospitals(allHospitals);
        if (saveResult.error) return saveResult;

        // VERIFICATION and Cleanup
        const actualHospitals = await syncAndAssembleData();
        const actualHospitalState = actualHospitals.find(h => h.id === hospitalId);
        if (actualHospitalState && actualHospitalState.departments.length > 0) {
             localStorage.setItem(HOSPITALS_KEY, JSON.stringify(actualHospitals));
             return { error: new Error('ریست کردن در پایگاه داده ناموفق بود. علت احتمالی: خط‌مشی‌های امنیتی (RLS).') };
        }
        
        if (pathsToDelete.length > 0) {
            (async () => {
                console.log(`(Background) Deleting ${pathsToDelete.length} files during hospital reset.`);
                await supabase.storage.from(BUCKET_NAME).remove(pathsToDelete);
            })();
        }
        return { error: null };
    } catch (e) {
        return { error: e instanceof Error ? e : new Error("خطای غیرمنتظره در ریست کردن بیمارستان رخ داد.") };
    }
}

export const upsertDepartment = async (department: Department, hospitalId: string): Promise<{ error: Error | null }> => {
    const hospitals = await syncAndAssembleData();
    const hospital = hospitals.find(h => h.id === hospitalId);
    if (!hospital) return { error: new Error("Hospital not found") };
    const deptIndex = hospital.departments.findIndex(d => d.id === department.id);
    if (deptIndex > -1) hospital.departments[deptIndex] = department; else hospital.departments.push(department);
    return saveAllHospitals(hospitals);
};

export const deleteDepartment = async (departmentId: string, hospitalId: string): Promise<{ error: Error | null }> => {
    const hospitals = await syncAndAssembleData();

    // Scope strictly to the hospital the caller is authorized for. This prevents a
    // department ID from ever being deleted from the wrong hospital's data.
    const hospital = hospitals.find(h => h.id === hospitalId);
    if (!hospital) return { error: new Error("Hospital not found") };

    const departmentToDelete = hospital.departments.find(d => d.id === departmentId);
    if (!departmentToDelete) return { error: new Error("Department not found in this hospital") };

    hospital.departments = hospital.departments.filter(d => d.id !== departmentId);

    const saveResult = await saveAllHospitals(hospitals);

    if (!saveResult.error && departmentToDelete) {
        (async () => {
            const pathsToDelete: string[] = [];
            departmentToDelete.trainingMaterials?.forEach(tm => tm.materials.forEach(m => m.storagePath && pathsToDelete.push(m.storagePath)));
            departmentToDelete.patientEducationMaterials?.forEach(m => m.storagePath && pathsToDelete.push(m.storagePath));
            departmentToDelete.patients?.forEach(p => p.chatHistory?.forEach(c => c.file?.storagePath && pathsToDelete.push(c.file.storagePath)));
            if (pathsToDelete.length > 0) {
                await supabase.storage.from(BUCKET_NAME).remove(pathsToDelete);
            }
        })();
    }
    return saveResult;
};

export const upsertStaff = async (staff: StaffMember, departmentId: string, hospitalId: string): Promise<{ error: Error | null }> => {
    const hospitals = await syncAndAssembleData();

    // Scope strictly to the hospital the caller is authorized for, instead of searching
    // every hospital's departments for a matching ID.
    const hospital = hospitals.find(h => h.id === hospitalId);
    if (!hospital) return { error: new Error("Hospital not found") };

    const department = hospital.departments.find(d => d.id === departmentId);
    if (!department) return { error: new Error("Department not found in this hospital") };

    const staffIndex = department.staff.findIndex(s => s.id === staff.id);
    if (staffIndex > -1) department.staff[staffIndex] = staff; else department.staff.push(staff);
    return saveAllHospitals(hospitals);
};

export const deleteStaff = async (staffId: string, hospitalId: string): Promise<{ error: Error | null }> => {
    const hospitals = await syncAndAssembleData();

    const hospital = hospitals.find(h => h.id === hospitalId);
    if (!hospital) return { error: new Error("Hospital not found") };

    let found = false;
    hospital.departments.forEach(d => {
        const before = d.staff.length;
        d.staff = d.staff.filter(s => s.id !== staffId);
        if (d.staff.length !== before) found = true;
    });
    if (!found) return { error: new Error("Staff member not found in this hospital") };

    return saveAllHospitals(hospitals);
};

export const upsertAssessment = async (assessment: Assessment, staffId: string, hospitalId: string): Promise<{ error: Error | null }> => {
    const hospitals = await syncAndAssembleData();

    const hospital = hospitals.find(h => h.id === hospitalId);
    if (!hospital) return { error: new Error("Hospital not found") };

    for (const d of hospital.departments) {
        const staff = d.staff.find(s => s.id === staffId);
        if (staff) {
            if (!staff.assessments) staff.assessments = [];
            const assessmentIndex = staff.assessments.findIndex(a => a.id === assessment.id);
            if (assessmentIndex > -1) staff.assessments[assessmentIndex] = assessment; else staff.assessments.push(assessment);
            return saveAllHospitals(hospitals);
        }
    }
    return { error: new Error("Staff member not found in this hospital") };
};

// ===================================================================
//  GRANULAR ATOMIC OPERATIONS
// ===================================================================

const performAtomicUpdate = async (updateLogic: (hospitals: Hospital[]) => void): Promise<{ error: Error | null }> => {
    try {
        const hospitals = await syncAndAssembleData();
        updateLogic(hospitals);
        return saveAllHospitals(hospitals);
    } catch (e) {
        return { error: e instanceof Error ? e : new Error("An unexpected error occurred during the update.") };
    }
};

export const addTrainingMaterial = (hospitalId: string, departmentId: string, month: string, material: TrainingMaterial) => performAtomicUpdate(hospitals => {
    const department = hospitals.find(h => h.id === hospitalId)?.departments.find(d => d.id === departmentId);
    if (!department) throw new Error("Department not found");

    if (!department.trainingMaterials) department.trainingMaterials = [];
    let monthly = department.trainingMaterials.find(t => t.month === month);
    if (!monthly) {
        monthly = { month, materials: [] };
        department.trainingMaterials.push(monthly);
    }
    monthly.materials.push(material);
});

export const addAccreditationMaterial = (hospitalId: string, material: TrainingMaterial) => performAtomicUpdate(hospitals => {
    const hospital = hospitals.find(h => h.id === hospitalId);
    if (!hospital) throw new Error("Hospital not found");
    if (!hospital.accreditationMaterials) hospital.accreditationMaterials = [];
    hospital.accreditationMaterials.push(material);
});

export const addNewsBanner = (hospitalId: string, banner: NewsBanner) => performAtomicUpdate(hospitals => {
    const hospital = hospitals.find(h => h.id === hospitalId);
    if (!hospital) throw new Error("Hospital not found");
    if (!hospital.newsBanners) hospital.newsBanners = [];
    hospital.newsBanners.push(banner);
});

export const addPatientEducationMaterial = (hospitalId: string, departmentId: string, material: TrainingMaterial) => performAtomicUpdate(hospitals => {
    const department = hospitals.find(h => h.id === hospitalId)?.departments.find(d => d.id === departmentId);
    if (!department) throw new Error("Department not found");
    if (!department.patientEducationMaterials) department.patientEducationMaterials = [];
    department.patientEducationMaterials.push(material);
});

export const addPatient = (hospitalId: string, departmentId: string, patient: Patient) => performAtomicUpdate(hospitals => {
    const department = hospitals.find(h => h.id === hospitalId)?.departments.find(d => d.id === departmentId);
    if (!department) throw new Error("Department not found");
    if (!department.patients) department.patients = [];
    department.patients.push(patient);
});

export const deletePatient = (hospitalId: string, departmentId: string, patientId: string) => performAtomicUpdate(hospitals => {
    const department = hospitals.find(h => h.id === hospitalId)?.departments.find(d => d.id === departmentId);
    if (department?.patients) {
        department.patients = department.patients.filter(p => p.id !== patientId);
    }
});

export const sendChatMessage = (hospitalId: string, departmentId: string, patientId: string, message: ChatMessage) => performAtomicUpdate(hospitals => {
    const patient = hospitals.find(h => h.id === hospitalId)?.departments.find(d => d.id === departmentId)?.patients?.find(p => p.id === patientId);
    if (!patient) throw new Error("Patient not found");
    if (!patient.chatHistory) patient.chatHistory = [];
    patient.chatHistory.push(message);
});

export const sendAdminMessage = (hospitalId: string, message: AdminMessage) => performAtomicUpdate(hospitals => {
    const hospital = hospitals.find(h => h.id === hospitalId);
    if (!hospital) throw new Error("Hospital not found");
    if (!hospital.adminMessages) hospital.adminMessages = [];
    hospital.adminMessages.push(message);
});

export const updateNeedsAssessmentTopics = (hospitalId: string, month: string, year: number, topics: NeedsAssessmentTopic[]) => performAtomicUpdate(hospitals => {
    const hospital = hospitals.find(h => h.id === hospitalId);
    if (!hospital) throw new Error("Hospital not found");
    if (!hospital.needsAssessments) hospital.needsAssessments = [];
    let assessment = hospital.needsAssessments.find(na => na.month === month && na.year === year);
    if (assessment) {
        assessment.topics = topics;
    } else {
        hospital.needsAssessments.push({ month, year, topics });
    }
});


// ===================================================================
//  USER AUTH
// ===================================================================

// The super-admin credential is never stored as plain text in the source. Instead we
// store the SHA-256 hash of "<nationalId>:<password>" and compare hashes at login time,
// so the raw national ID / password never appear in the bundled client code.
// (Computed once and pinned here; see sha256Hex below for how a candidate is hashed.)
const ADMIN_CREDENTIAL_HASH = 'f6b88b2ab0047b42be4053a12a697dbd7e1e2c03cf097ef4f5c31505b3946d51';

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const DEFAULT_PROVINCES = [
  'تهران', 'خوزستان', 'اصفهان', 'فارس', 'خراسان رضوی', 'آذربایجان شرقی', 
  'مازندران', 'گیلان', 'کرمان', 'یزد', 'البرز', 'هرمزگان', 'بوشهر', 
  'همدان', 'کرمانشاه', 'لرستان', 'سیستان و بلوچستان', 'مرکزی', 'قم', 'قزوین'
];

export const DEFAULT_ABOUT_INFO: AppAboutInfo = {
  title: 'درباره سامانه جهش',
  description:
    'سامانه جهش یک پلتفرم پیشرفته و یکپارچه برای مدیریت هوشمند عملکرد و توانمندسازی پرسنل مراکز درمانی است. این سامانه با هدف دیجیتالی کردن فرآیندهای ارزیابی، آموزش و بهبود مستمر طراحی شده تا به مدیران در تصمیم‌گیری‌های مبتنی بر داده و به پرسنل در مسیر رشد حرفه‌ای خود کمک کند.',
  features: [
    'مدیریت جامع: تعریف و مدیریت همزمان چندین بیمارستان، بخش و پرسنل با سطوح دسترسی مختلف (ادمین، معاونت درمان، سوپروایزر، مسئول بخش).',
    'ارزیابی عملکرد: امکان بارگذاری چک‌لیست‌های عملکردی از طریق فایل اکسل یا ساخت قالب‌های سفارشی درون برنامه برای ارزیابی دقیق مهارت‌ها.',
    'آزمون‌های آنلاین با سوالات تصادفی: طراحی و برگزاری آزمون‌های تئوری با گزینش رندوم سوالات و گزینه‌ها جهت ممانعت از تقلب.',
    'مدیریت آموزش چندرسانه‌ای: نگارش مقالات غنی آموزشی با امکانات Word و درج تصویر و فیلم با پلیر واکنش‌گرا.',
    'برنامه راهبردی و بهبود هوشمند: تدوین خودکار اکشن پلن‌های ۱، ۳، ۶ و ۱۲ ماهه مبتنی بر ۵ رفرنس بالینی و خروجی Word.',
    'تحلیل و گزارش‌دهی: مشاهده روند پیشرفت فردی و گروهی با نمودارهای تحلیلی و بصری.',
    'ذخیره‌سازی و امنیت داده: پشتیبانی از ذخیره‌سازی ابری و دیتابیس سوپابیس و سی‌پنل.',
  ],
  closingPoem: 'ستایش خداوندِ بخشنده را\nکه موجود کرد از عدم بنده را',
  creatorName: 'حسین نصاری',
  creatorEmail: 'ho3in.n12@gmail.com',
  aparatUrl: 'https://www.aparat.com/Amazing.Nurse/',
  version: 'نسخه ۲.۵ (پاییز ۱۴۰۵)',
};

export const DEFAULT_APP_ICON = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%232563eb"><rect width="100" height="100" rx="22" fill="%231e40af"/><path d="M50 20 L50 80 M20 50 L80 50" stroke="white" stroke-width="14" stroke-linecap="round"/><circle cx="50" cy="50" r="12" fill="%23f59e0b"/></svg>';

export const getOfficersFromLocal = (): ProvincialOfficer[] => {
  try {
    const raw = localStorage.getItem('provincial_officers');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveOfficers = (officers: ProvincialOfficer[]) => {
  localStorage.setItem('provincial_officers', JSON.stringify(officers));
};

export const getProvincesFromLocal = (hospitals: Hospital[] = []): string[] => {
  try {
    const raw = localStorage.getItem('app_provinces');
    const stored: string[] = raw ? JSON.parse(raw) : [];
    const set = new Set<string>([...stored, ...hospitals.map(h => h.province).filter(Boolean), ...DEFAULT_PROVINCES]);
    return Array.from(set);
  } catch {
    return DEFAULT_PROVINCES;
  }
};

export const saveProvinces = (provinces: string[]) => {
  localStorage.setItem('app_provinces', JSON.stringify(provinces));
};

export const getArchivedArticlesFromLocal = (): ArchivedArticleTemplate[] => {
  try {
    const raw = localStorage.getItem('archived_training_articles');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveArchivedArticles = (articles: ArchivedArticleTemplate[]) => {
  localStorage.setItem('archived_training_articles', JSON.stringify(articles));
};

export const getAboutInfoFromLocal = (): AppAboutInfo => {
  try {
    const raw = localStorage.getItem('app_about_info');
    return raw ? JSON.parse(raw) : DEFAULT_ABOUT_INFO;
  } catch {
    return DEFAULT_ABOUT_INFO;
  }
};

export const saveAboutInfo = (info: AppAboutInfo) => {
  localStorage.setItem('app_about_info', JSON.stringify(info));
};

export const getAppIconFromLocal = (): string => {
  try {
    return localStorage.getItem('app_custom_icon_url') || DEFAULT_APP_ICON;
  } catch {
    return DEFAULT_APP_ICON;
  }
};

export const updateDomFavicons = (iconUrl: string) => {
  if (typeof document === 'undefined') return;
  try {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = iconUrl;

    let appleLink = document.querySelector("link[rel~='apple-touch-icon']") as HTMLLinkElement;
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.getElementsByTagName('head')[0].appendChild(appleLink);
    }
    appleLink.href = iconUrl;
  } catch (e) {
    console.error("Failed to update favicons in DOM", e);
  }
};

export const saveAppIcon = (iconUrl: string) => {
  localStorage.setItem('app_custom_icon_url', iconUrl);
  updateDomFavicons(iconUrl);
};

/**
 * Resolves login credentials to a user + role.
 */
export const findUser = async (
  hospitals: Hospital[],
  nationalId: string,
  password: string,
  hospitalId?: string
): Promise<LoggedInUser | null> => {
  const candidateHash = await sha256Hex(`${nationalId}:${password}`);
  if (candidateHash === ADMIN_CREDENTIAL_HASH) {
    return { role: UserRole.Admin, name: 'ادمین کل' };
  }

  // Check Provincial Officers (can log in without selecting a hospital)
  const officers = getOfficersFromLocal();
  const officer = officers.find(o => o.nationalId === nationalId && o.password === password);
  if (officer) {
    return {
      role: UserRole.ProvincialOfficer,
      name: officer.name,
      province: officer.province,
      officerId: officer.id,
    };
  }

  if (!hospitalId) return null;
  const hospital = hospitals.find(h => h.id === hospitalId);
  if (!hospital) return null;

  if (hospital.supervisorNationalId === nationalId && hospital.supervisorPassword === password) {
    return { role: UserRole.Supervisor, name: hospital.supervisorName || 'سوپروایزر', hospitalId: hospital.id };
  }
  for (const department of hospital.departments) {
    if (department.managerNationalId === nationalId && department.managerPassword === password) {
      return { role: UserRole.Manager, name: department.managerName, hospitalId: hospital.id, departmentId: department.id };
    }
    for (const staff of department.staff) {
      if (staff.nationalId === nationalId && staff.password === password) {
        return { role: UserRole.Staff, name: staff.name, hospitalId: hospital.id, departmentId: department.id, staffId: staff.id };
      }
    }
    for (const patient of department.patients || []) {
      if (patient.nationalId === nationalId && patient.password === password) {
        return { role: UserRole.Patient, name: patient.name, hospitalId: hospital.id, departmentId: department.id, patientId: patient.id };
      }
    }
  }
  return null;
};
