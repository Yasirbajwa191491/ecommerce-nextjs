import numpy as np
import pytest

from app.ml.errors import TrainingError
from app.ml.models.content_recommender import ContentRecommender
from app.ml.preprocessing.products import ProductRecord
from tests.ml.support import product_record


def _fit(*records: ProductRecord) -> ContentRecommender:
    model = ContentRecommender()
    model.fit(records)
    return model


def test_fit_is_deterministic() -> None:
    records = (
        product_record("p-1", description="Wireless noise cancelling headphones"),
        product_record("p-2", description="Wireless bluetooth headphones", company="Lumen"),
        product_record(
            "p-3",
            name="Bookshelf Speakers",
            description="Passive walnut bookshelf speakers",
            company="Birchline",
            category_name="Audio",
            category_slug="audio",
        ),
    )
    first = ContentRecommender()
    second = ContentRecommender()
    summary_a = first.fit(records)
    summary_b = second.fit(records)
    assert summary_a == summary_b
    assert summary_a.use_text_tfidf is True
    assert summary_a.vocabulary_size > 0
    assert summary_a.feature_dimensions > 0
    assert np.allclose(first.matrix.toarray(), second.matrix.toarray())
    assert first.recommend("p-1", top_k=2) == second.recommend("p-1", top_k=2)


def test_single_product_fits_and_has_no_recommendations() -> None:
    model = _fit(product_record("only-one"))
    result = model.recommend("only-one", top_k=5)
    assert result.recommendations == ()
    assert result.model_version == "content-v1"


def test_empty_dataset_raises() -> None:
    model = ContentRecommender()
    with pytest.raises(TrainingError, match="empty"):
        model.fit(())


def test_duplicate_ids_are_rejected_before_scoring() -> None:
    model = ContentRecommender()
    with pytest.raises(TrainingError, match="duplicate"):
        model.fit((product_record("same"), product_record("same", description="Other text")))


def test_empty_vocabulary_falls_back_to_categorical_features() -> None:
    model = _fit(
        product_record(
            "stop-1",
            name="the",
            description="a an the",
            company="Acme",
            category_slug="audio",
            category_name="the",
            highlights=[],
            seo_keywords=[],
            colors=[],
        ),
        product_record(
            "stop-2",
            name="of",
            description="the",
            company="Other",
            category_slug="audio",
            category_name="the",
            highlights=[],
            seo_keywords=[],
            colors=[],
        ),
        product_record(
            "stop-3",
            name="and",
            description="a",
            company="Third",
            category_slug="garden",
            category_name="the",
            highlights=[],
            seo_keywords=[],
            colors=[],
        ),
    )
    assert model.feature_config["use_text_tfidf"] is False
    same_category = model.recommend("stop-1", top_k=2)
    assert same_category.recommendations[0].product_id == "stop-2"


def test_stars_reviews_and_featured_do_not_change_vectors() -> None:
    base = (
        product_record("p-1", stars=1, reviews=0, featured=False),
        product_record("p-2", stars=1, reviews=0, featured=False, company="Other Co"),
    )
    changed = (
        product_record("p-1", stars=5, reviews=400, featured=True),
        product_record("p-2", stars=2, reviews=1, featured=True, company="Other Co"),
    )
    left = _fit(*base)
    right = _fit(*changed)
    assert np.allclose(left.matrix.toarray(), right.matrix.toarray())


def test_active_flag_does_not_change_the_vector() -> None:
    active = _fit(product_record("p-1"), product_record("p-2", company="Other Co"))
    inactive = _fit(
        product_record("p-1"),
        product_record("p-2", company="Other Co", active=False),
    )
    assert np.allclose(active.matrix.toarray(), inactive.matrix.toarray())
    assert inactive.recommend("p-1", top_k=5).recommendations == ()
