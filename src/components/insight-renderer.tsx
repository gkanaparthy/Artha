import ReactMarkdown from "react-markdown";

interface InsightRendererProps {
    content: string;
}

export function InsightRenderer({ content }: InsightRendererProps) {
    return (
        <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown
                components={{
                    h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-primary" {...props} />,
                    p: ({ node, ...props }) => <p className="text-muted-foreground leading-relaxed mb-4" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2" {...props} />,
                    li: ({ node, ...props }) => <li className="text-muted-foreground" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
