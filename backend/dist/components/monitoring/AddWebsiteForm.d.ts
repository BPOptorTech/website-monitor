interface Website {
    id: number;
    name: string;
    url: string;
    created_at: string;
}
interface AddWebsiteFormProps {
    onWebsiteAdded: (website: Website) => void;
}
export default function AddWebsiteForm({ onWebsiteAdded }: AddWebsiteFormProps): any;
export {};
//# sourceMappingURL=AddWebsiteForm.d.ts.map