const Container = ({ children, className = "", ...props }) => {
    return (
        <main className={`container mx-auto p-4 mb-5 ${className}`} {...props}>
            {children}
        </main>
    );
};

export default Container;
