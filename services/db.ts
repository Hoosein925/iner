import { Hospital, Department, StaffMember, Assessment, LoggedInUser, UserRole, MonthlyWorkLog } from '../types';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = 'https://etpitgyohgpbygyfgeyt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cGl0Z3lvaGdwYnlneWZnZXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjEzMTcsImV4cCI6MjA3NjY5NzMxN30.pVNJL7KxU4RQ2zMPqHE0kYkkhp1eNI7pjiwSlmRPEMg'
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey)

const DB_NAME = 'SkillAssessmentDB';
const DB_VERSION = 1;
const STORE_NAME = 'trainingMaterials';

let db: IDBDatabase;

export const initDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(true);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', request.error);
      reject(false);
    };

    request.onsuccess = (event) => {
      db = request.result;
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const addMaterial = (material: { id: string; data: string }): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
        return reject('DB is not initialized.');
    }
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(material);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      console.error('Error adding material to DB:', request.error);
      reject(request.error);
    };
  });
};

export const getMaterialData = (id: string): Promise<string | undefined> => {
  return new Promise((resolve, reject) => {
    if (!db) {
        return reject('DB is not initialized.');
    }
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result?.data);
    };
    request.onerror = () => {
      console.error('Error getting material from DB:', request.error);
      reject(request.error);
    };
  });
};

export const deleteMaterial = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
        return reject('DB is not initialized.');
    }
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      console.error('Error deleting material from DB:', request.error);
      reject(request.error);
    };
  });
};

export const getAllMaterials = (): Promise<{id: string, data: string}[]> => {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject('DB is not initialized.');
        }
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            console.error('Error getting all materials from DB:', request.error);
            reject(request.error);
        };
    });
};

export const clearAllMaterials = (): Promise<void> => {
     return new Promise((resolve, reject) => {
        if (!db) {
            return reject('DB is not initialized.');
        }
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          console.error('Error clearing materials from DB:', request.error);
          reject(request.error);
        };
  });
}

const HOSPITALS_KEY = 'hospitals_data';
const DATA_ROW_ID = 1; // Assuming a single row in our table to hold all hospital data.

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
    await initDB(); // Ensure IndexedDB is ready for file operations.
    
    const { data, error } = await supabase
      .from('hospitals_json')
      .select('data')
      .eq('id', DATA_ROW_ID)
      .single();

    // PGRST116: "The result contains 0 rows". This is not a fatal error, just means no data yet.
    if (error && error.code !== 'PGRST116') {
        console.warn(`Could not fetch data from Supabase (Code: ${error.code}), using local fallback. Message: ${error.message}`);
        return getHospitalsFromLocal();
    }

    if (data && data.data) {
        // Update local storage with fresh data from supabase
        localStorage.setItem(HOSPITALS_KEY, JSON.stringify(data.data));
        return data.data as Hospital[];
    }
    
    // If no data in supabase (or it's an empty row), return local
    return getHospitalsFromLocal();
};

let channel: RealtimeChannel | null = null;
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
    
    const unsubscribe = () => {
        if (channel) {
            supabase.removeChannel(channel);
            channel = null;
        }
    };

    return unsubscribe;
};

// Saves to both Supabase and local storage.
export const saveAllHospitals = async (hospitals: Hospital[]): Promise<{ error: Error | null }> => {
    try {
        // Save to local storage first for immediate offline availability
        localStorage.setItem(HOSPITALS_KEY, JSON.stringify(hospitals));
    } catch (e) {
        console.error("Failed to save hospitals to localStorage", e);
        // We can still try to save to supabase
    }

    try {
        const { error } = await supabase
            .from('hospitals_json')
            .upsert({ id: DATA_ROW_ID, data: hospitals }, { onConflict: 'id' });

        if (error) {
            console.error("Error saving data to Supabase:", error);
            // Construct a more detailed error message string
            const errorMessage = `Supabase Error: ${error.message} (Code: ${error.code}). Hint: ${error.hint || 'No hint'}. Details: ${error.details || 'No details'}.`;
            return { error: new Error(errorMessage) };
        }
    } catch (e) {
        console.error("A network or unexpected error occurred while saving to Supabase:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown network error occurred.";
        return { error: new Error(errorMessage) };
    }
    
    return { error: null };
};


const getHospitals = (): Hospital[] => {
    return getHospitalsFromLocal();
};


export const upsertHospital = async (hospital: Hospital): Promise<{ error: Error | null }> => {
    const hospitals = getHospitals();
    const index = hospitals.findIndex(h => h.id === hospital.id);
    if (index > -1) {
        hospitals[index] = hospital;
    } else {
        hospitals.push(hospital);
    }
    return saveAllHospitals(hospitals);
};

export const deleteHospital = async (hospitalId: string): Promise<{ error: Error | null }> => {
    let hospitals = getHospitals();
    hospitals = hospitals.filter(h => h.id !== hospitalId);
    return saveAllHospitals(hospitals);
};

export const upsertDepartment = async (department: Department, hospitalId: string): Promise<{ error: Error | null }> => {
    const hospitals = getHospitals();
    const hospital = hospitals.find(h => h.id === hospitalId);
    if (!hospital) return { error: new Error("Hospital not found") };

    const deptIndex = hospital.departments.findIndex(d => d.id === department.id);
    if (deptIndex > -1) {
        hospital.departments[deptIndex] = department;
    } else {
        hospital.departments.push(department);
    }
    return saveAllHospitals(hospitals);
};

export const deleteDepartment = async (departmentId: string): Promise<{ error: Error | null }> => {
    const hospitals = getHospitals();
    hospitals.forEach(h => {
        h.departments = h.departments.filter(d => d.id !== departmentId);
    });
    return saveAllHospitals(hospitals);
};

export const upsertStaff = async (staff: StaffMember, departmentId: string): Promise<{ error: Error | null }> => {
    const hospitals = getHospitals();
    for (const h of hospitals) {
        const department = h.departments.find(d => d.id === departmentId);
        if (department) {
            const staffIndex = department.staff.findIndex(s => s.id === staff.id);
            if (staffIndex > -1) {
                department.staff[staffIndex] = staff;
            } else {
                department.staff.push(staff);
            }
            return saveAllHospitals(hospitals);
        }
    }
    return { error: new Error("Department not found") };
};

export const deleteStaff = async (staffId: string): Promise<{ error: Error | null }> => {
    const hospitals = getHospitals();
    hospitals.forEach(h => {
        h.departments.forEach(d => {
            d.staff = d.staff.filter(s => s.id !== staffId);
        });
    });
    return saveAllHospitals(hospitals);
};

export const upsertAssessment = async (assessment: Assessment, staffId: string): Promise<{ error: Error | null }> => {
    const hospitals = getHospitals();
    for (const h of hospitals) {
        for (const d of h.departments) {
            const staff = d.staff.find(s => s.id === staffId);
            if (staff) {
                const assessmentIndex = staff.assessments.findIndex(a => a.id === assessment.id);
                if (assessmentIndex > -1) {
                    staff.assessments[assessmentIndex] = assessment;
                } else {
                    staff.assessments.push(assessment);
                }
                return saveAllHospitals(hospitals);
            }
        }
    }
    return { error: new Error("Staff member not found") };
};

export const bulkPutFiles = async (files: {id: string, data: string}[]): Promise<void> => {
    for (const file of files) {
        await addMaterial(file);
    }
};

export const findUser = (hospitals: Hospital[], nationalId: string, password: string): LoggedInUser | null => {
  // Admin check (hardcoded for example)
  if (nationalId === '5850008985' && password === '64546') {
    return { role: UserRole.Admin, name: 'ادمین کل' };
  }

  for (const hospital of hospitals) {
    // Supervisor check
    if (hospital.supervisorNationalId === nationalId && hospital.supervisorPassword === password) {
      return { role: UserRole.Supervisor, name: hospital.supervisorName || 'سوپروایزر', hospitalId: hospital.id };
    }

    for (const department of hospital.departments) {
      // Manager check
      if (department.managerNationalId === nationalId && department.managerPassword === password) {
        return { role: UserRole.Manager, name: department.managerName, hospitalId: hospital.id, departmentId: department.id };
      }

      for (const staff of department.staff) {
        // Staff check
        if (staff.nationalId === nationalId && staff.password === password) {
          return { role: UserRole.Staff, name: staff.name, hospitalId: hospital.id, departmentId: department.id, staffId: staff.id };
        }
      }
        // Patient Check
        for (const patient of department.patients || []) {
            if (patient.nationalId === nationalId && patient.password === password) {
                return { role: UserRole.Patient, name: patient.name, hospitalId: hospital.id, departmentId: department.id, patientId: patient.id };
            }
        }
    }
  }

  return null;
};