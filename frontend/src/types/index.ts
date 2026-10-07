// src/types/index.ts

export interface User {
  id: number;
  username: string;
  email: string;
  usertype_id: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  message?: string;
}

export interface Niveau {
  id: number;
  description: string;
}

export interface Classe {
  id: number;
  label: string;
  abrev: string | null;
  fil: string;
  nb_mx_el: number;
  niv_id: number;
  niveau?: Niveau;
}

export interface Eleve {
  numero: number;
  nom: string;
  residence: string;
  tel: string;
  nom_tut: string;
  date_entre: string;
  date_sortie: string;
  cls_id: number;
  etat: number | null;
  annee_scolaire?: string | null;
  resultat?: string | null;
  classe?: Classe;
}

export interface Matiere {
  identifient: number;
  description: string;
  language: string;
}

export interface Professeur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  matiere_id: number | null;
  matiere?: string | null;
}

export interface FraisInscription {
  id: number;
  eleve_id: number;
  annee_scolaire: string;
  montant_total: number;
  montant_paye: number;
  statut: 'paye' | 'partiel' | 'non_paye';
  date_inscription: string;
  date_paiement: string | null;
  methode_paiement: string | null;
  reference: string | null;
  observations: string | null;
  eleve_nom?: string | null;
  restant?: number;
}

export interface CompteCash {
  id: number;
  nom: string;
  solde: number;
  date_creation: string;
  description: string | null;
}

export interface TransactionCash {
  id: number;
  compte_id: number;
  type_transaction: 'entree' | 'sortie';
  montant: number;
  date_transaction: string;
  description: string | null;
  source: string | null;
  source_id: number | null;
  methode_paiement: string | null;
  reference: string | null;
  utilisateur: string | null;
}

export interface SalaireProfesseur {
  id: number;
  professeur_id: number;
  mois: number;
  annee: number;
  montant_total: number;
  montant_paye: number;
  statut: 'paye' | 'partiel' | 'non_paye';
  date_paiement: string | null;
  methode_paiement: string | null;
  reference: string | null;
  observations: string | null;
  professeur_nom?: string | null;
  restant?: number;
}

export interface FraisScolaires {
  id: number;
  eleve_id: number;
  annee_scolaire: string;
  mois: number;
  montant_total: number;
  montant_paye: number;
  statut: 'paye' | 'partiel' | 'non_paye';
  date_echeance: string | null;
  date_paiement: string | null;
  methode_paiement: string | null;
  reference: string | null;
  observations: string | null;
  eleve_nom?: string | null;
  restant?: number;
}

export interface Depense {
  id: number;
  categorie: string;
  montant: number;
  date_depense: string;
  description: string | null;
  beneficiaire: string | null;
  methode_paiement: string | null;
  reference: string | null;
  piece_jointe: string | null;
  observations: string | null;
  utilisateur: string | null;
}

export interface Coefficient {
  id: number;
  mat_id: number;
  cl_id: number;
  niv_id: number;
  valeur: number;
  matiere?: Matiere;
  classe?: Classe;
  niveau?: Niveau;
}

export interface Examen {
  num: number;
  type: string;
  coeficient: number;
}

export interface Note {
  id: number;
  valeur: number;
  mat_id: number;
  classe_id: number;
  ele_id: number;
  examen_id: number;
  coef_id: number;
  matiere?: Matiere;
  eleve?: Eleve;
  examen?: Examen;
  coefficient?: Coefficient;
}

export interface Stats {
  totalStudents: number;
  totalClasses: number;
  totalSubjects: number;
  attendanceRate: string;
  averageGrade: number | null;
}

// Response types for API calls
export interface StudentsResponse {
  eleves: Eleve[];
}

export interface ClassesResponse {
  classes: Classe[];
}

export interface SubjectsResponse {
  matieres: Matiere[];
}

export interface ProfesseursResponse {
  professeurs: Professeur[];
}

export interface FraisInscriptionResponse {
  frais_inscription: FraisInscription[];
}

export interface FraisInscriptionStats {
  total: number;
  payes: number;
  partiels: number;
  non_payes: number;
  montant_total: number;
  montant_collecte: number;
  montant_restant: number;
}

export interface ComptesCashResponse {
  comptes_cash: CompteCash[];
}

export interface TransactionsCashResponse {
  transactions_cash: TransactionCash[];
}

export interface TransactionCashStats {
  total_entrees: number;
  total_sorties: number;
  solde_net: number;
  nombre_entrees: number;
  nombre_sorties: number;
  nombre_total: number;
}

export interface SalaireProfesseursResponse {
  salaires: SalaireProfesseur[];
}

export interface SalaireProfesseurStats {
  total: number;
  payes: number;
  partiels: number;
  non_payes: number;
  montant_total: number;
  montant_paye: number;
  montant_restant: number;
}

export interface FraisScolairesResponse {
  frais_scolaires: FraisScolaires[];
}

export interface FraisScolairesStats {
  total: number;
  payes: number;
  partiels: number;
  non_payes: number;
  montant_total: number;
  montant_collecte: number;
  montant_restant: number;
}

export interface DepensesResponse {
  depenses: Depense[];
}

export interface DepenseStats {
  total_depenses: number;
  nombre: number;
  moyenne: number;
  categories: Array<{
    categorie: string;
    montant: number;
    nombre: number;
  }>;
}

export interface GradesResponse {
  notes: Note[];
}

export interface ExamsResponse {
  examens: Examen[];
}

export interface StatsResponse extends Stats {}

export interface ApiError {
  error: string;
  message?: string;
}

export interface Identifiable {
  id?: number | string;
  numero?: number;
  identifient?: number;
  num?: number;
}

export interface CoefficientsResponse {
  coefficients: Coefficient[];
}

export interface CreateCoefficientData {
  mat_id: number;
  cl_id: number;
  niv_id: number;
  valeur: number;
}

export interface AverageResponse {
  eleve_id: number;
  examen_id: number;
  average: number | null;
  total_notes: number;
  message?: string;
}

export interface NotesResponse {
  notes: Note[];
}

export interface NoteResponse {
  message: string;
  note: Note;
}

export interface LevelsResponse {
  levels: Niveau[];
}

export interface CoefficientCheckResponse {
  exists: boolean;
  coefficient_id?: number;
  valeur?: number;
  message?: string;
  error?: string;
}

export interface CreateNoteData {
  valeur: number;
  mat_id: number;
  classe_id: number;
  ele_id: number;
  examen_id: number;
}

export interface UpdateNoteData {
  valeur?: number;
  mat_id?: number;
  classe_id?: number;
  ele_id?: number;
  examen_id?: number;
}

export interface StudentClassSubjectsResponse {
  student_id: number;
  student_name: string;
  class_id: number;
  class_label: string;
  subjects: Array<{
    subject_id: number;
    subject_name: string;
    coefficient_id: number;
    coefficient_value: number;
  }>;
}
