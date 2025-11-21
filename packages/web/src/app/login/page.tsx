import { Suspense } from "react";
import Form from "./form";

export default function Login() {
  return (
    // useSearchParams kullanan bileşenler Suspense içinde olmalıdır.
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <Form />
    </Suspense>
  );
}