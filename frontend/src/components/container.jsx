const Container = ({ children, className = "", ...props }) => {
    return (
        <main className={`container mx-auto p-6 mb-5 max-w-4xl ${className}`} {...props}>
            {children}
        </main>
    );
};

export default Container;
