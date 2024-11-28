const NodeHtmlRenderer = ({ html }: { html: string }) => {
    return <div className='node-content' dangerouslySetInnerHTML={{ __html: html }} />
};

export { NodeHtmlRenderer };