import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFoundPage() {
  return (
    <div className="grid min-h-full place-items-center bg-surface px-4">
      <EmptyState icon="alert" title="Страница не найдена" action={<ButtonLink to="/" variant="primary">На главную</ButtonLink>}>
        Проверьте адрес или вернитесь на главную.
      </EmptyState>
    </div>
  );
}
