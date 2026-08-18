const REVIEW_TITLE_MIN = 3;
const REVIEW_CONTENT_MIN = 20;

export type ReviewFormValues = {
  rating: number;
  title: string;
  content: string;
};

export function validateReviewForm(
  values: ReviewFormValues
): Partial<Record<keyof ReviewFormValues, string>> {
  const errors: Partial<Record<keyof ReviewFormValues, string>> = {};

  if (!Number.isInteger(values.rating) || values.rating < 1 || values.rating > 5) {
    errors.rating = "Select a rating from 1 to 5 stars";
  }

  const title = values.title.trim();
  if (title.length < REVIEW_TITLE_MIN) {
    errors.title = `Title must be at least ${REVIEW_TITLE_MIN} characters`;
  }

  const content = values.content.trim();
  if (content.length < REVIEW_CONTENT_MIN) {
    errors.content = `Review must be at least ${REVIEW_CONTENT_MIN} characters`;
  }

  return errors;
}
