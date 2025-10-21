import Logo from "./logo";
import Form from "./form";


export default function Login() {
    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <div style={{ position: 'absolute', top: '0px', left: '0px' }}>
                <Logo />
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                }}
            >
                <Form />
            </div>
        </div>
    );
}
