declare module 'lucide-react/dist/esm/icons/*' {
    const icon: import('react').ForwardRefExoticComponent<
        Omit<import('lucide-react').LucideProps, 'ref'> & import('react').RefAttributes<SVGSVGElement>
    >;
    export default icon;
}
