import { Hospital, LoggedInUser, UserRole, Department, StaffMember, Assessment, TrainingMaterial, NewsBanner, Patient, ChatMessage, AdminMessage, NeedsAssessmentTopic } from '../types';
// FIX: The RealtimeChannel type is not exported from supabase-js anymore.
// The type will be inferred from the supabase client instance.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etpitgyohgpbygyfgeyt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cGl0Z3lvaGdwYnlneWZnZXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjEzMTcsImV4cCI6MjA3NjY5NzMxN30.pVNJL7KxU4RQ2zMPqHE0kYkkhp1eNI7pjiwSlmRPEMg'
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey)

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

const getHospitalsFromLocal = (): Hospital[] => {
    try {
        const data = localStorage.getItem(HOSPITALS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to parse hospitals from localStorage", e);
        return [];
    }
};

export const syncAndAssembleData = async (): Promise<Hospital[]> => {
    const { data, error } = await supabase
      .from('hospitals_json')
      .select('data')
      .eq('id', DATA_ROW_ID)
      .single();

    if (error && error.code !== 'PGRST116') {
        console.warn(`Could not fetch data from Supabase (Code: ${error.code}), using local fallback. Message: ${error.message}`);
        return getHospitalsFromLocal();
    }

    if (data && data.data) {
        localStorage.setItem(HOSPITALS_KEY, JSON.stringify(data.data));
        return data.data as Hospital[];
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
            console.error("Supabase upsert error:", supabaseError);
            let userFriendlyMessage = `خطا در ذخیره اطلاعات در پایگاه داده: ${supabaseError.message}`;
            
            if (supabaseError.code === '42501' || supabaseError.message.includes('security policies')) {
                userFriendlyMessage = `تغییرات توسط پایگاه داده رد شد.\nاین مشکل تقریباً همیشه به دلیل خط‌مشی‌های امنیتی (Row Level Security) در Supabase است.\nلطفاً وارد پنل Supabase خود شوید و اطمینان حاصل کنید که یک پالیسی برای اجازه عملیات 'UPDATE' و 'INSERT' روی جدول 'hospitals_json' وجود دارد. بدون این پالیسی، هیچ تغییری (مانند حذف یا افزودن) ذخیره نخواهد شد.`;
            } else {
                 userFriendlyMessage += ` (کد خطا: ${supabaseError.code})`;
            }
            return { error: new Error(userFriendlyMessage) };
        }
         return { error: null };

    } catch (e) {
        console.error("A network or unexpected error occurred while saving to Supabase:", e);
        const errorMessage = e instanceof Error 
            ? `خطای شبکه یا خطای غیرمنتظره: ${e.message}`
            : "یک خطای ناشناخته در ارتباط با پایگاه داده رخ داد.";
        return { error: new Error(errorMessage) };
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

export const deleteDepartment = async (departmentId: string): Promise<{ error: Error | null }> => {
    const hospitals = await syncAndAssembleData();
    let departmentToDelete: Department | undefined;
    
    hospitals.forEach(h => {
        const dept = h.departments.find(d => d.id === departmentId);
        if(dept) departmentToDelete = dept;
        h.departments = h.departments.filter(d => d.id !== departmentId);
    });

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

export const upsertStaff = async (staff: StaffMember, departmentId: string): Promise<{ error: Error | null }> => {
    const hospitals = await syncAndAssembleData();
    for (const h of hospitals) {
        const department = h.departments.find(d => d.id === departmentId);
        if (department) {
            const staffIndex = department.staff.findIndex(s => s.id === staff.id);
            if (staffIndex > -1) department.staff[staffIndex] = staff; else department.staff.push(staff);
            return saveAllHospitals(hospitals);
        }
    }
    return { error: new Error("Department not found") };
};

export const deleteStaff = async (staffId: string): Promise<{ error: Error | null }> => {
    const hospitals = await syncAndAssembleData();
    hospitals.forEach(h => { h.departments.forEach(d => { d.staff = d.staff.filter(s => s.id !== staffId); }); });
    return saveAllHospitals(hospitals);
};

export const upsertAssessment = async (assessment: Assessment, staffId: string): Promise<{ error: Error | null }> => {
    const hospitals = await syncAndAssembleData();
    for (const h of hospitals) {
        for (const d of h.departments) {
            const staff = d.staff.find(s => s.id === staffId);
            if (staff) {
                if (!staff.assessments) staff.assessments = [];
                const assessmentIndex = staff.assessments.findIndex(a => a.id === assessment.id);
                if (assessmentIndex > -1) staff.assessments[assessmentIndex] = assessment; else staff.assessments.push(assessment);
                return saveAllHospitals(hospitals);
            }
        }
    }
    return { error: new Error("Staff member not found") };
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

export const findUser = (hospitals: Hospital[], nationalId: string, password: string): LoggedInUser | null => {
  if (nationalId === '5850008985' && password === '64546') {
    return { role: UserRole.Admin, name: 'ادمین کل' };
  }
  for (const hospital of hospitals) {
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
  }
  return null;
};
