import { ChangeEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { hapticImpact } from "../telegram/webapp";

const GOALS = ["DATING", "FRIENDSHIP", "CHAT", "RELATIONSHIP"] as const;
const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;

const MAX_PHOTOS = 6;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface UploadedPhoto {
  id: string;
  url: string;
}

export default function ProfileSetupPage() {
  const { t } = useTranslation();

  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.userId);
  const setSession = useAuthStore((s) => s.setSession);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    displayName: "",
    age: 18,
    gender: "MALE" as (typeof GENDERS)[number],
    genderPref: "EVERYONE",
    bio: "",
    city: "",
    country: "",
    datingGoal: "CHAT" as (typeof GOALS)[number],
  });

  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [photoError, setPhotoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function updateForm<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openFilePicker() {
    if (uploading || photos.length >= MAX_PHOTOS) {
      return;
    }

    fileInputRef.current?.click();
  }

  async function handlePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    // Allow selecting the same file again later.
    event.target.value = "";

    if (!files.length) {
      return;
    }

    setPhotoError(null);

    const remainingSlots = MAX_PHOTOS - photos.length;

    if (files.length > remainingSlots) {
      setPhotoError(
        `You can add ${remainingSlots} more photo${
          remainingSlots === 1 ? "" : "s"
        }.`,
      );
    }

    const selectedFiles = files.slice(0, remainingSlots);

    for (const file of selectedFiles) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setPhotoError("Please choose a JPG, PNG, or WebP image.");
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setPhotoError("Each photo must be smaller than 10 MB.");
        continue;
      }

      try {
        setUploading(true);

        hapticImpact("light");

        /*
         * Step 1:
         * Ask our backend for a presigned upload URL.
         */
        const { data: uploadData } = await api.post("/photos/upload-url", {
          contentType: file.type,
        });

        /*
         * Step 2:
         * Upload the image directly to storage.
         */
        const uploadResponse = await fetch(uploadData.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Storage upload failed (${uploadResponse.status})`);
        }

        /*
         * Step 3:
         * Tell our backend that the upload succeeded.
         */
        const { data: confirmedPhoto } = await api.post("/photos/confirm", {
          storageKey: uploadData.storageKey,
          publicUrl: uploadData.publicUrl,
        });

        setPhotos((current) => [
          ...current,
          {
            id: confirmedPhoto.id,
            url: confirmedPhoto.url,
          },
        ]);
      } catch (error: any) {
        console.error("Photo upload failed:", error);

        const backendMessage =
          error?.response?.data?.message?.message ??
          error?.response?.data?.message ??
          error?.message;

        setPhotoError(
          backendMessage || "Could not upload this photo. Please try again.",
        );

        break;
      } finally {
        setUploading(false);
      }
    }
  }

  async function removePhoto(photoId: string) {
    try {
      setPhotoError(null);

      await api.delete(`/photos/${photoId}`);

      setPhotos((current) => current.filter((photo) => photo.id !== photoId));

      hapticImpact("light");
    } catch (error: any) {
      console.error("Photo removal failed:", error);

      const backendMessage =
        error?.response?.data?.message?.message ??
        error?.response?.data?.message ??
        error?.message;

      setPhotoError(
        backendMessage || "Could not remove this photo. Please try again.",
      );
    }
  }

  async function handleSave() {
    setFormError(null);

    if (!form.displayName.trim()) {
      setFormError("Please enter your name.");
      return;
    }

    if (form.age < 18 || form.age > 99) {
      setFormError("Your age must be between 18 and 99.");
      return;
    }

    if (uploading) {
      return;
    }

    try {
      setSaving(true);

      await api.put("/profiles/me", {
        ...form,
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
      });

      if (accessToken && userId) {
        setSession(accessToken, userId, false);
      }
    } catch (error: any) {
      console.error("Profile save failed:", error);

      const backendMessage =
        error?.response?.data?.message?.message ??
        error?.response?.data?.message ??
        error?.message;

      setFormError(
        backendMessage || "Could not save your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <header className="profile-header">
          <div className="profile-header-badge">✨</div>

          <h1>{t("profile_setup.title")}</h1>

          <p>{t("profile_setup.photos")}</p>
        </header>

        {/* Photos */}
        <section className="photo-section">
          <div className="section-heading">
            <div>
              <h2>Photos</h2>
              <p>Add up to {MAX_PHOTOS} photos</p>
            </div>

            <span className="photo-counter">
              {photos.length}/{MAX_PHOTOS}
            </span>
          </div>

          <div className="photo-grid">
            {Array.from({
              length: MAX_PHOTOS,
            }).map((_, index) => {
              const photo = photos[index];

              if (!photo) {
                return (
                  <button
                    key={`empty-${index}`}
                    type="button"
                    className="photo-slot photo-slot-empty"
                    onClick={openFilePicker}
                    disabled={uploading || photos.length >= MAX_PHOTOS}
                    aria-label="Add photo"
                  >
                    <span className="photo-plus">+</span>

                    {index === 0 && photos.length === 0 && (
                      <span className="photo-main-label">Main photo</span>
                    )}
                  </button>
                );
              }

              return (
                <div key={photo.id} className="photo-slot photo-slot-filled">
                  <img src={photo.url} alt="" className="photo-preview" />

                  <button
                    type="button"
                    className="photo-remove"
                    onClick={() => void removePhoto(photo.id)}
                    disabled={uploading}
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={handlePhotoSelect}
            disabled={uploading || photos.length >= MAX_PHOTOS}
          />

          {uploading && (
            <div className="upload-status">
              <span className="loading-spinner" />
              <span>Uploading photo...</span>
            </div>
          )}

          {photoError && (
            <p className="form-error" role="alert">
              {photoError}
            </p>
          )}

          <button
            type="button"
            className="secondary-action"
            onClick={openFilePicker}
            disabled={uploading || photos.length >= MAX_PHOTOS}
          >
            {photos.length >= MAX_PHOTOS
              ? "Maximum photos added"
              : "+ Add photos"}
          </button>
        </section>

        {/* Profile form */}
        <section className="form-section">
          {/* Name */}
          <div className="field">
            <label className="field-label" htmlFor="display-name">
              {t("profile_setup.display_name")}
            </label>

            <input
              id="display-name"
              type="text"
              className="form-control"
              placeholder={t("profile_setup.display_name")}
              autoComplete="name"
              maxLength={50}
              value={form.displayName}
              onChange={(event) =>
                updateForm("displayName", event.target.value)
              }
            />
          </div>

          {/* Age */}
          <div className="field">
            <label className="field-label" htmlFor="age">
              {t("profile_setup.age")}
            </label>

            <input
              id="age"
              type="number"
              inputMode="numeric"
              min={18}
              max={99}
              className="form-control"
              value={form.age}
              onChange={(event) =>
                updateForm("age", Number(event.target.value))
              }
            />
          </div>

          {/* Gender */}
          <fieldset className="field-group">
            <legend className="field-label">{t("profile_setup.gender")}</legend>

            <div className="choice-grid choice-grid-3">
              {GENDERS.map((gender) => (
                <button
                  key={gender}
                  type="button"
                  className={`choice-button ${
                    form.gender === gender ? "choice-button-active" : ""
                  }`}
                  onClick={() => updateForm("gender", gender)}
                >
                  {t(`profile_setup.gender_${gender.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Bio */}
          <div className="field">
            <div className="field-label-row">
              <label className="field-label" htmlFor="bio">
                {t("profile_setup.bio")}
              </label>

              <span className="character-count">{form.bio.length}/500</span>
            </div>

            <textarea
              id="bio"
              className="form-control form-textarea"
              placeholder={t("profile_setup.bio")}
              rows={4}
              maxLength={500}
              value={form.bio}
              onChange={(event) => updateForm("bio", event.target.value)}
            />
          </div>

          {/* City / Country */}
          <div className="two-column-fields">
            <div className="field">
              <label className="field-label" htmlFor="city">
                {t("profile_setup.city")}
              </label>

              <input
                id="city"
                type="text"
                className="form-control"
                placeholder={t("profile_setup.city")}
                autoComplete="address-level2"
                value={form.city}
                onChange={(event) => updateForm("city", event.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="country">
                {t("profile_setup.country")}
              </label>

              <input
                id="country"
                type="text"
                className="form-control"
                placeholder={t("profile_setup.country")}
                autoComplete="country-name"
                value={form.country}
                onChange={(event) => updateForm("country", event.target.value)}
              />
            </div>
          </div>

          {/* Dating goal */}
          <fieldset className="field-group">
            <legend className="field-label">{t("profile_setup.goal")}</legend>

            <div className="choice-grid choice-grid-2">
              {GOALS.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  className={`choice-button ${
                    form.datingGoal === goal ? "choice-button-active" : ""
                  }`}
                  onClick={() => updateForm("datingGoal", goal)}
                >
                  {t(`profile_setup.goal_${goal.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        {/* Save */}
        <button
          type="button"
          className="save-button"
          disabled={saving || uploading || !form.displayName.trim()}
          onClick={handleSave}
        >
          {saving ? (
            <>
              <span className="loading-spinner loading-spinner-light" />
              Saving...
            </>
          ) : (
            t("profile_setup.save")
          )}
        </button>

        <p className="profile-footer-note">
          You can update your profile later.
        </p>
      </div>
    </main>
  );
}
