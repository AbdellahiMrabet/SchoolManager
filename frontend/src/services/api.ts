// src/services/api.ts
import {
  Stats,
  StudentsResponse,
  ClassesResponse,
  SubjectsResponse,
  GradesResponse,
  ExamsResponse,
  StatsResponse,
  AuthResponse,
  User,
  Eleve,
  Classe,
  Matiere,
  Note,
  Examen,
  Coefficient,
  CreateCoefficientData,
  CoefficientCheckResponse,
  NoteResponse,
  CreateNoteData,
  AverageResponse,
  NotesResponse,
  LevelsResponse,
  Niveau,
  Professeur,
  ProfesseursResponse,
  FraisInscription,
  FraisInscriptionResponse,
  FraisInscriptionStats,
  CompteCash,
  ComptesCashResponse,
  TransactionCash,
  TransactionsCashResponse,
  TransactionCashStats,
  SalaireProfesseur,
  SalaireProfesseursResponse,
  SalaireProfesseurStats,
  FraisScolaires,
  FraisScolairesResponse,
  FraisScolairesStats,
  Depense,
  DepensesResponse,
  DepenseStats,
} from '../types';

const API_BASE = process.env.REACT_APP_API_BASE;
export const TOKEN_EXPIRED_EVENT = 'token_expired';

class ApiService {
  private token: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    // Check if token expires in less than 30 seconds
    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    return currentTime >= expirationTime - 30000; // 30 seconds buffer
  }

  private onTokenRefreshed(token: string) {
    this.setToken(token);
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.triggerTokenExpired();
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        this.triggerTokenExpired();
        return null;
      }

      const data = await response.json();
      const newToken = data.access_token;
      this.onTokenRefreshed(newToken);
      return newToken;
    } catch (error) {
      this.triggerTokenExpired();
      return null;
    }
  }

  private triggerTokenExpired() {
    // Clear tokens
    this.setToken(null);
    localStorage.removeItem('refresh_token');
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent(TOKEN_EXPIRED_EVENT));
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const token = this.getToken();
    
    // Check if token exists and is not expired
    if (token && this.isTokenExpired(token)) {
      // Token expired, try to refresh
      const newToken = await this.refreshAccessToken();
      if (!newToken) {
        this.triggerTokenExpired();
        throw new Error('Session expired. Please login again.');
      }
      // Retry with new token
      return this.request(endpoint, options, retryCount + 1);
    }

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    const currentToken = this.getToken();
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      // Try to refresh token once
      if (retryCount === 0) {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          // Retry with new token
          return this.request(endpoint, options, retryCount + 1);
        }
      }
      // If refresh fails or retry count > 0, trigger logout
      this.triggerTokenExpired();
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    const data = await response.json();
    this.setToken(data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
  }

  async register(
    username: string,
    email: string,
    password: string,
    usertype: number = 2
  ): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, usertype }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    const data = await response.json();
    this.setToken(data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string; message: string }> {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Token refresh failed');
    }
    return response.json();
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request('/auth/me');
  }

  // Student endpoints
  async getStudents(): Promise<StudentsResponse> {
    return this.request('/eleves');
  }

  async getStudent(numero: number): Promise<Eleve> {
    return this.request(`/eleves/${numero}`);
  }

  async createStudent(data: Partial<Eleve>): Promise<Eleve> {
    return this.request('/eleves', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async importStudents(cls_id: number, date_entre: string, students: Array<{nom: string; residence?: string; tel?: string; nom_tut?: string}>) {
    return this.request('/eleves/import', {
      method: 'POST',
      body: JSON.stringify({ cls_id, date_entre, students }),
    });
  }

  async importStudentsExcel(cls_id: number, date_entre: string, file: File): Promise<{
    message: string;
    created: any[];
    errors: string[];
  }> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('cls_id', cls_id.toString());
    formData.append('date_entre', date_entre);

    const response = await fetch(`${API_BASE}/eleves/import-excel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Excel import failed');
    }

    return response.json();
  }

  async updateStudent(numero: number, data: Partial<Eleve>): Promise<Eleve> {
    return this.request(`/eleves/${numero}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStudent(numero: number): Promise<{ message: string }> {
    return this.request(`/eleves/${numero}`, {
      method: 'DELETE',
    });
  }

  async promoteStudents(studentIds: number[], targetClsId: number): Promise<{ message: string; promoted: number[]; errors: string[] }> {
    return this.request('/eleves/promote', {
      method: 'POST',
      body: JSON.stringify({ student_ids: studentIds, target_cls_id: targetClsId }),
    });
  }

  async getPromotionEligibility(classeId: number): Promise<{
    students: Array<{ numero: number; nom: string; overall_average: number | null; eligible: boolean }>;
    current_class: { id: number; label: string; abrev: string | null };
    next_class: { id: number; label: string; abrev: string | null } | null;
    threshold: number;
  }> {
    return this.request(`/eleves/promote/eligible/${classeId}`);
  }

  async promoteStudentsConfirmed(promotions: Array<{ student_id: number; target_cls_id: number }>): Promise<{ message: string; promoted: number[]; errors: string[] }> {
    return this.request('/eleves/promote', {
      method: 'POST',
      body: JSON.stringify({ promotions }),
    });
  }

  // Class endpoints
  async getClasses(): Promise<ClassesResponse> {
    return this.request('/classes');
  }

  async getClass(id: number): Promise<Classe> {
    return this.request(`/classes/${id}`);
  }

  async createClass(data: Partial<Classe>): Promise<Classe> {
    return this.request('/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClass(id: number, data: Partial<Classe>): Promise<Classe> {
    return this.request(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClass(id: number): Promise<{ message: string }> {
    return this.request(`/classes/${id}`, {
      method: 'DELETE',
    });
  }

  // Subject endpoints
  async getSubjects(): Promise<SubjectsResponse> {
    return this.request('/matieres');
  }

  async getSubject(identifient: number): Promise<Matiere> {
    return this.request(`/matieres/${identifient}`);
  }

  async createSubject(data: Partial<Matiere>): Promise<Matiere> {
    return this.request('/matieres', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSubject(identifient: number, data: Partial<Matiere>): Promise<Matiere> {
    return this.request(`/matieres/${identifient}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSubject(identifient: number): Promise<{ message: string }> {
    return this.request(`/matieres/${identifient}`, {
      method: 'DELETE',
    });
  }

  // Teacher endpoints
  async getTeachers(): Promise<ProfesseursResponse> {
    return this.request('/professeurs');
  }

  async getTeacher(id: number): Promise<Professeur> {
    return this.request(`/professeurs/${id}`);
  }

  async createTeacher(data: Partial<Professeur>): Promise<Professeur> {
    return this.request('/professeurs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeacher(id: number, data: Partial<Professeur>): Promise<Professeur> {
    return this.request(`/professeurs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTeacher(id: number): Promise<{ message: string }> {
    return this.request(`/professeurs/${id}`, {
      method: 'DELETE',
    });
  }

  // Registration Fees endpoints
  async getRegistrationFees(filters?: { annee_scolaire?: string; statut?: string; eleve_id?: number }): Promise<FraisInscriptionResponse> {
    const params = new URLSearchParams();
    if (filters?.annee_scolaire) params.append('annee_scolaire', filters.annee_scolaire);
    if (filters?.statut) params.append('statut', filters.statut);
    if (filters?.eleve_id) params.append('eleve_id', filters.eleve_id.toString());
    const queryString = params.toString();
    return this.request(`/frais-inscription${queryString ? `?${queryString}` : ''}`);
  }

  async getRegistrationFee(id: number): Promise<FraisInscription> {
    return this.request(`/frais-inscription/${id}`);
  }

  async createRegistrationFee(data: Partial<FraisInscription>): Promise<FraisInscription> {
    return this.request('/frais-inscription', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRegistrationFee(id: number, data: Partial<FraisInscription>): Promise<FraisInscription> {
    return this.request(`/frais-inscription/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addPayment(id: number, data: { montant: number; date_paiement?: string; methode_paiement?: string; reference?: string }): Promise<FraisInscription> {
    return this.request(`/frais-inscription/${id}/paiement`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteRegistrationFee(id: number): Promise<{ message: string }> {
    return this.request(`/frais-inscription/${id}`, {
      method: 'DELETE',
    });
  }

  async getRegistrationFeeStats(annee_scolaire?: string): Promise<FraisInscriptionStats> {
    const params = annee_scolaire ? `?annee_scolaire=${annee_scolaire}` : '';
    return this.request(`/frais-inscription/stats${params}`);
  }

  // Cash Account endpoints
  async getComptesCash(): Promise<ComptesCashResponse> {
    return this.request('/compte-cash');
  }

  async getCompteCash(id: number): Promise<CompteCash> {
    return this.request(`/compte-cash/${id}`);
  }

  async createCompteCash(data: Partial<CompteCash>): Promise<CompteCash> {
    return this.request('/compte-cash', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompteCash(id: number, data: Partial<CompteCash>): Promise<CompteCash> {
    return this.request(`/compte-cash/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompteCash(id: number): Promise<{ message: string }> {
    return this.request(`/compte-cash/${id}`, {
      method: 'DELETE',
    });
  }

  async getTransactionsCash(filters?: { compte_id?: number; type_transaction?: string; source?: string; date_debut?: string; date_fin?: string }): Promise<TransactionsCashResponse> {
    const params = new URLSearchParams();
    if (filters?.compte_id) params.append('compte_id', filters.compte_id.toString());
    if (filters?.type_transaction) params.append('type_transaction', filters.type_transaction);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.date_debut) params.append('date_debut', filters.date_debut);
    if (filters?.date_fin) params.append('date_fin', filters.date_fin);
    const queryString = params.toString();
    return this.request(`/transactions-cash${queryString ? `?${queryString}` : ''}`);
  }

  async createTransactionCash(data: Partial<TransactionCash>): Promise<TransactionCash> {
    return this.request('/transactions-cash', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTransactionCash(id: number): Promise<{ message: string }> {
    return this.request(`/transactions-cash/${id}`, {
      method: 'DELETE',
    });
  }

  async getTransactionCashStats(filters?: { compte_id?: number; date_debut?: string; date_fin?: string }): Promise<TransactionCashStats> {
    const params = new URLSearchParams();
    if (filters?.compte_id) params.append('compte_id', filters.compte_id.toString());
    if (filters?.date_debut) params.append('date_debut', filters.date_debut);
    if (filters?.date_fin) params.append('date_fin', filters.date_fin);
    const queryString = params.toString();
    return this.request(`/transactions-cash/stats${queryString ? `?${queryString}` : ''}`);
  }

  // Teacher Payments endpoints
  async getSalairesProfesseurs(filters?: { professeur_id?: number; mois?: number; annee?: number; statut?: string }): Promise<SalaireProfesseursResponse> {
    const params = new URLSearchParams();
    if (filters?.professeur_id) params.append('professeur_id', filters.professeur_id.toString());
    if (filters?.mois) params.append('mois', filters.mois.toString());
    if (filters?.annee) params.append('annee', filters.annee.toString());
    if (filters?.statut) params.append('statut', filters.statut);
    const queryString = params.toString();
    return this.request(`/salaires-professeurs${queryString ? `?${queryString}` : ''}`);
  }

  async getSalaireProfesseur(id: number): Promise<SalaireProfesseur> {
    return this.request(`/salaires-professeurs/${id}`);
  }

  async createSalaireProfesseur(data: Partial<SalaireProfesseur>): Promise<SalaireProfesseur> {
    return this.request('/salaires-professeurs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSalaireProfesseur(id: number, data: Partial<SalaireProfesseur>): Promise<SalaireProfesseur> {
    return this.request(`/salaires-professeurs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addPaiementSalaire(id: number, data: { montant: number; date_paiement?: string; methode_paiement?: string; reference?: string }): Promise<SalaireProfesseur> {
    return this.request(`/salaires-professeurs/${id}/paiement`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSalaireProfesseur(id: number): Promise<{ message: string }> {
    return this.request(`/salaires-professeurs/${id}`, {
      method: 'DELETE',
    });
  }

  async getSalairesProfesseurStats(filters?: { annee?: number; professeur_id?: number }): Promise<SalaireProfesseurStats> {
    const params = new URLSearchParams();
    if (filters?.annee) params.append('annee', filters.annee.toString());
    if (filters?.professeur_id) params.append('professeur_id', filters.professeur_id.toString());
    const queryString = params.toString();
    return this.request(`/salaires-professeurs/stats${queryString ? `?${queryString}` : ''}`);
  }

  // School Fees endpoints
  async getFraisScolaires(filters?: { annee_scolaire?: string; statut?: string; eleve_id?: number; mois?: number }): Promise<FraisScolairesResponse> {
    const params = new URLSearchParams();
    if (filters?.annee_scolaire) params.append('annee_scolaire', filters.annee_scolaire);
    if (filters?.statut) params.append('statut', filters.statut);
    if (filters?.eleve_id) params.append('eleve_id', filters.eleve_id.toString());
    if (filters?.mois) params.append('mois', filters.mois.toString());
    const queryString = params.toString();
    return this.request(`/frais-scolaires${queryString ? `?${queryString}` : ''}`);
  }

  async getFraisScolaire(id: number): Promise<FraisScolaires> {
    return this.request(`/frais-scolaires/${id}`);
  }

  async createFraisScolaire(data: Partial<FraisScolaires>): Promise<FraisScolaires> {
    return this.request('/frais-scolaires', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFraisScolaire(id: number, data: Partial<FraisScolaires>): Promise<FraisScolaires> {
    return this.request(`/frais-scolaires/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addPaiementFraisScolaire(id: number, data: { montant: number; date_paiement?: string; methode_paiement?: string; reference?: string }): Promise<FraisScolaires> {
    return this.request(`/frais-scolaires/${id}/paiement`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteFraisScolaire(id: number): Promise<{ message: string }> {
    return this.request(`/frais-scolaires/${id}`, {
      method: 'DELETE',
    });
  }

  async getFraisScolairesStats(filters?: { annee_scolaire?: string }): Promise<FraisScolairesStats> {
    const params = new URLSearchParams();
    if (filters?.annee_scolaire) params.append('annee_scolaire', filters.annee_scolaire);
    const queryString = params.toString();
    return this.request(`/frais-scolaires/stats${queryString ? `?${queryString}` : ''}`);
  }

  // Expenses endpoints
  async getDepenses(filters?: { date_debut?: string; date_fin?: string; categorie?: string }): Promise<DepensesResponse> {
    const params = new URLSearchParams();
    if (filters?.date_debut) params.append('date_debut', filters.date_debut);
    if (filters?.date_fin) params.append('date_fin', filters.date_fin);
    if (filters?.categorie) params.append('categorie', filters.categorie);
    const queryString = params.toString();
    return this.request(`/depenses${queryString ? `?${queryString}` : ''}`);
  }

  async getDepense(id: number): Promise<Depense> {
    return this.request(`/depenses/${id}`);
  }

  async createDepense(data: Partial<Depense>): Promise<Depense> {
    return this.request('/depenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDepense(id: number, data: Partial<Depense>): Promise<Depense> {
    return this.request(`/depenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDepense(id: number): Promise<{ message: string }> {
    return this.request(`/depenses/${id}`, {
      method: 'DELETE',
    });
  }

  async getDepensesStats(filters?: { date_debut?: string; date_fin?: string; categorie?: string }): Promise<DepenseStats> {
    const params = new URLSearchParams();
    if (filters?.date_debut) params.append('date_debut', filters.date_debut);
    if (filters?.date_fin) params.append('date_fin', filters.date_fin);
    if (filters?.categorie) params.append('categorie', filters.categorie);
    const queryString = params.toString();
    return this.request(`/depenses/stats${queryString ? `?${queryString}` : ''}`);
  }

  // Exam endpoints
  async getExams(): Promise<ExamsResponse> {
    return this.request('/examens');
  }

  async getExam(num: number): Promise<Examen> {
    return this.request(`/examens/${num}`);
  }

  async createExam(data: Partial<Examen>): Promise<Examen> {
    return this.request('/examens', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExam(num: number, data: Partial<Examen>): Promise<Examen> {
    return this.request(`/examens/${num}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExam(num: number): Promise<{ message: string }> {
    return this.request(`/examens/${num}`, {
      method: 'DELETE',
    });
  }

  // Stats endpoint
  async getStats(): Promise<StatsResponse> {
    return this.request('/stats');
  }

// Coefficient endpoints
async getCoefficients(): Promise<{ coefficients: Coefficient[] }> {
  return this.request('/coefficients');
}

async getCoefficient(id: number): Promise<Coefficient> {
  return this.request(`/coefficients/${id}`);
}

async getCoefficientsByClass(classeId: number): Promise<{ coefficients: Coefficient[] }> {
  return this.request(`/coefficients/by-class/${classeId}`);
}

async getCoefficientsBySubject(matiereId: number): Promise<{ coefficients: Coefficient[] }> {
  return this.request(`/coefficients/by-subject/${matiereId}`);
}

async getCoefficientsByLevel(niveauId: number): Promise<{ coefficients: Coefficient[] }> {
  return this.request(`/coefficients/by-level/${niveauId}`);
}

async createCoefficient(data: CreateCoefficientData): Promise<{ message: string; coefficient: Coefficient }> {
  return this.request('/coefficients', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async updateCoefficient(id: number, data: Partial<CreateCoefficientData>): Promise<{ message: string; coefficient: Coefficient }> {
  return this.request(`/coefficients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

async deleteCoefficient(id: number): Promise<{ message: string }> {
  return this.request(`/coefficients/${id}`, {
    method: 'DELETE',
  });
}


// Level endpoints
async getLevels(): Promise<LevelsResponse> {
  return this.request('/levels');
}

async getLevel(id: number): Promise<Niveau> {
  return this.request(`/levels/${id}`);
}

// Grade endpoints 
async getGrades(): Promise<NotesResponse> {
  return this.request('/notes');
}

async getGrade(id: number): Promise<Note> {
  return this.request(`/notes/${id}`);
}

async getStudentGrades(eleveId: number): Promise<NotesResponse> {
  return this.request(`/eleves/${eleveId}/notes`);
}

async getClassGrades(classeId: number): Promise<NotesResponse> {
  return this.request(`/classes/${classeId}/notes`);
}

async getExamGrades(examenId: number): Promise<NotesResponse> {
  return this.request(`/examens/${examenId}/notes`);
}

async getStudentExamGrades(eleveId: number, examenId: number): Promise<NotesResponse> {
  return this.request(`/notes/student/${eleveId}/exam/${examenId}`);
}

async calculateStudentAverage(eleveId: number, examenId: number): Promise<AverageResponse> {
  return this.request(`/notes/calculate-average/${eleveId}/${examenId}`);
}

async checkCoefficient(matId: number, classeId: number): Promise<CoefficientCheckResponse> {
  return this.request(`/notes/check-coefficient/${matId}/${classeId}`);
}

// Create grade - coef_id is auto-detected from database
async createGrade(data: { 
  valeur: number; 
  mat_id: number; 
  classe_id: number; 
  ele_id: number; 
  examen_id: number;
}): Promise<NoteResponse> {
  return this.request('/notes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Update grade - coef_id is auto-detected from database
async updateGrade(id: number, data: Partial<{ 
  valeur: number; 
  mat_id: number; 
  classe_id: number; 
  ele_id: number; 
  examen_id: number;
}>): Promise<NoteResponse> {
  return this.request(`/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

async deleteGrade(id: number): Promise<{ message: string }> {
  return this.request(`/notes/${id}`, {
    method: 'DELETE',
  });
}

// Get student's class and subjects
async getStudentClassSubjects(studentId: number): Promise<{
  student: { numero: number; nom: string };
  class: { 
    id: number; 
    label: string;
    abrev: string;
    niv_id: number };
  subjects: Array<{
    subject_id: number;
    subject_name: string;
    coefficient_id: number;
    coefficient_value: number;
  }>;
}> {
  return this.request(`/eleves/${studentId}/class-subjects`);
}

async getStudentAvailableSubjects(studentId: number): Promise<{
  student_id: number;
  student_name: string;
  class_id: number;
  class_label: string;
  class_abbreviation: string;
  subjects: Array<{
    subject_id: number;
    subject_name: string;
    coefficient_id: number;
    coefficient_value: number;
  }>;
}> {
  return this.request(`/grades/student/${studentId}/available-subjects`);
}

// Batch create grades
async createBatchGrades(data: {
  ele_id: number;
  examen_id: number;
  grades: Array<{
    mat_id: number;
    valeur: number;
  }>;
}): Promise<{
  message: string;
  created: Array<{ id: number; mat_id: number; valeur: number; status: string }>;
  errors: string[];
  total_processed: number;
  total_errors: number;
}> {
  return this.request('/notes/batch', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Get all grades for a student in an exam
async getStudentExamAllGrades(eleveId: number, examenId: number): Promise<{
  student_id: number;
  student_name: string;
  class_id: number;
  class_label: string;
  class_abbreviation: string;
  examen_id: number;
  subjects: Array<{
    subject_id: number;
    subject_name: string;
    coefficient_id: number;
    coefficient_value: number;
    grade_id: number | null;
    grade_value: number | null;
  }>;
}> {
  return this.request(`/notes/student/${eleveId}/exam/${examenId}/grades`);
}

// Get all students' grades for a subject + class + exam
async getSubjectClassGrades(classeId: number, matiereId: number, examenId: number): Promise<{
  class_id: number;
  class_label: string;
  class_abrev: string;
  matiere_id: number;
  examen_id: number;
  coefficient_id: number | null;
  coefficient_value: number | null;
  students: Array<{
    student_id: number;
    student_name: string;
    grade_id: number | null;
    grade_value: number | null;
  }>;
}> {
  const params = new URLSearchParams({
    classe_id: classeId.toString(),
    matiere_id: matiereId.toString(),
    examen_id: examenId.toString(),
  });
  return this.request(`/notes/subject-class?${params.toString()}`);
}

// Save grades for all students in a class for a subject + exam
async saveSubjectClassGrades(data: {
  classe_id: number;
  matiere_id: number;
  examen_id: number;
  grades: Array<{ student_id: number; valeur: number }>;
}): Promise<{
  message: string;
  created: Array<{ student_id: number; status: string; valeur: number }>;
  errors: string[];
  total_processed: number;
  total_errors: number;
}> {
  return this.request('/notes/subject-class', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
// Logout method - clears all tokens without triggering expiry event
  logout(): void {
    this.setToken(null);
    localStorage.removeItem('refresh_token');
    // Don't dispatch TOKEN_EXPIRED_EVENT — this is an intentional logout
  }
  
// Get student bulletin
async getStudentBulletin(studentId: number): Promise<{
  student: {
    numero: number;
    nom: string;
    residence: string;
    tel: string;
    nom_tut: string;
    date_entre: string;
    date_sortie: string;
  };
  niveau: string | null;
  class: {
    id: number;
    label: string;
    niveau: string | null;
  };
  subjects: Array<{
    subject_id: number;
    subject_name: string;
    coefficient: number;
    compositions: Array<{
      exam_id: number;
      exam_name: string;
      grade: number | null;
      coefficient: number;
    }>;
    homework: Array<{
      homework_id: number;
      date: string | null;
      grade: number;
    }>;
    average_composition: number | null;
    average_homework: number | null;
    overall_average: number | null;
  }>;
  overall_average: number | null;
}> {
  return this.request(`/bulletin/${studentId}`);
}

  async getUsers(): Promise<{ users: Array<{ id: number; username: string; email: string; usertype_id: number; usertype_name: string | null }> }> {
    return this.request('/auth/users');
  }

  async getUserTypes(): Promise<{ usertypes: Array<{ id: number; name: string }> }> {
    return this.request('/auth/usertypes');
  }

  async updateUserType(userId: number, usertypeId: number): Promise<{ message: string }> {
    return this.request(`/auth/users/${userId}/usertype`, {
      method: 'PUT',
      body: JSON.stringify({ usertype_id: usertypeId }),
    });
  }

  async deleteUser(userId: number): Promise<{ message: string }> {
    return this.request(`/auth/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Accounting (OHADA)
  async getPlanComptable() {
    return this.request('/plan-comptable');
  }

  async createAccount(data: { numero: string; classe: number; libelle: string; type_compte: string }) {
    return this.request('/plan-comptable', { method: 'POST', body: JSON.stringify(data) });
  }

  async getEcritures(dateDebut?: string, dateFin?: string) {
    let url = '/ecritures?';
    if (dateDebut) url += `date_debut=${dateDebut}&`;
    if (dateFin) url += `date_fin=${dateFin}&`;
    return this.request(url);
  }

  async createEcriture(data: any) {
    return this.request('/ecritures', { method: 'POST', body: JSON.stringify(data) });
  }

  async getGrandLivre(dateDebut?: string, dateFin?: string, compte?: string) {
    let url = '/grand-livre?';
    if (dateDebut) url += `date_debut=${dateDebut}&`;
    if (dateFin) url += `date_fin=${dateFin}&`;
    if (compte) url += `compte=${compte}&`;
    return this.request(url);
  }

  async getBalance() {
    return this.request('/balance');
  }

  async getBilan() {
    return this.request('/bilan');
  }

  async getCompteResultat() {
    return this.request('/compte-resultat');
  }

  async syncEcritures() {
    return this.request('/sync', { method: 'POST' });
  }

}

export const apiService = new ApiService();
export default apiService;