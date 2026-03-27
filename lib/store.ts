import { create } from 'zustand'

export interface User { id: string; email: string }
export interface Document {
  id: string; fileName: string; status: 'processing' | 'completed' | 'failed'
  createdAt: string; extractedData?: ExtractedData | null
}
export interface LineItem { description: string; quantity: number; unit_price: number; total: number }
export interface ExtractedData {
  vendor_name: string | null; client_name: string | null; invoice_number: string | null
  invoice_date: string | null; due_date: string | null
  total_amount: number | null; currency: string | null
  tax_amount: number | null; line_items: LineItem[]
}
export interface PlanInfo {
  plan: string; planName: string; docsThisMonth: number
  docsRemaining: number; totalDocsUsed: number
  trialEndsAt: string | null; trialDaysLeft: number | null
  isTrialExpired: boolean; maxDocs: number
}

interface AuthStore {
  user: User | null; setUser: (user: User | null) => void
}
interface DocumentStore {
  documents: Document[]; setDocuments: (docs: Document[]) => void
  addDocument: (doc: Document) => void
  updateDocument: (id: string, data: Partial<Document>) => void
}
interface PlanStore {
  planInfo: PlanInfo | null; setPlanInfo: (info: PlanInfo | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null, setUser: (user) => set({ user }),
}))

export const useDocumentStore = create<DocumentStore>((set) => ({
  documents: [],
  setDocuments: (documents) => set({ documents }),
  addDocument: (doc) => set((state) => ({ documents: [doc, ...state.documents] })),
  updateDocument: (id, data) =>
    set((state) => ({ documents: state.documents.map((d) => (d.id === id ? { ...d, ...data } : d)) })),
}))

export const usePlanStore = create<PlanStore>((set) => ({
  planInfo: null, setPlanInfo: (planInfo) => set({ planInfo }),
}))
