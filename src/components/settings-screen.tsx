/* eslint-disable @next/next/no-img-element -- User-uploaded demo avatars are local data URLs, not optimizable remote assets. */
"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { useDemoStore } from "@/components/demo-store-provider";
import { readFileAsDataUrl, validateImageFile } from "@/lib/file-validation";
import type { ProfileInput } from "@/lib/types";

export function SettingsScreen() {
  const { profile, resetDemoData, updateProfile } = useDemoStore();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="page-stack">
      <PageHeader
        description="Actualiza la información que verán tus grupos y tu institución."
        eyebrow="Configuración de perfil"
        title="Configuración"
      />

      <section aria-labelledby="profile-title" className="profile-card">
        <div className="section-heading">
          <h2 id="profile-title">Tu perfil</h2>
          <button aria-label="Editar perfil" className="icon-button" onClick={() => setIsEditing(true)} type="button">
            Editar
          </button>
        </div>
        <div className="profile-layout">
          {profile.avatarUrl ? (
            <img alt="" className="profile-photo" src={profile.avatarUrl} />
          ) : (
            <span className="profile-photo profile-photo-placeholder" aria-hidden="true">
              {profile.fullName.slice(0, 2).toUpperCase()}
            </span>
          )}
          <dl className="profile-details">
            <div>
              <dt>Nombre completo</dt>
              <dd>{profile.fullName}</dd>
            </div>
            <div>
              <dt>Correo institucional</dt>
              <dd>{profile.email}</dd>
            </div>
            <div className="profile-bio">
              <dt>Biografía breve</dt>
              <dd>{profile.biography}</dd>
            </div>
          </dl>
        </div>
        <div className="profile-footer">
          <button className="button button-danger-outline" onClick={resetDemoData} type="button">
            Restablecer demo local
          </button>
        </div>
      </section>

      {isEditing ? (
        <ProfileFormModal
          initialProfile={profile}
          onClose={() => setIsEditing(false)}
          onSubmit={(input) => {
            updateProfile(input);
            setIsEditing(false);
          }}
        />
      ) : null}
    </div>
  );
}

function ProfileFormModal({
  initialProfile,
  onClose,
  onSubmit
}: Readonly<{
  initialProfile: ProfileInput;
  onClose: () => void;
  onSubmit: (input: ProfileInput) => void;
}>) {
  const [fullName, setFullName] = useState(initialProfile.fullName);
  const [email, setEmail] = useState(initialProfile.email);
  const [biography, setBiography] = useState(initialProfile.biography);
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl);
  const [fileError, setFileError] = useState("");

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setFileError(error);
      return;
    }

    setFileError("");
    setAvatarUrl(await readFileAsDataUrl(file));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ avatarUrl, biography, email, fullName });
  }

  return (
    <Modal onClose={onClose} title="Editar perfil">
      <form className="form-stack" onSubmit={handleSubmit}>
        <div className="profile-upload">
          {avatarUrl ? <img alt="" className="avatar avatar-large avatar-image" src={avatarUrl} /> : <span className="avatar avatar-large">Foto</span>}
          <label className="file-button">
            Foto de perfil
            <input accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} type="file" />
          </label>
          <small>JPG, PNG o WebP. Máximo 2 MB.</small>
          {fileError ? <p className="form-error">{fileError}</p> : null}
        </div>
        <label className="field" htmlFor="profile-name">
          Nombre completo
          <input id="profile-name" maxLength={120} onChange={(event) => setFullName(event.target.value)} required value={fullName} />
        </label>
        <label className="field" htmlFor="profile-email">
          Correo institucional
          <input
            id="profile-email"
            maxLength={160}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="field" htmlFor="profile-biography">
          Biografía breve
          <textarea
            id="profile-biography"
            maxLength={500}
            onChange={(event) => setBiography(event.target.value)}
            required
            rows={5}
            value={biography}
          />
        </label>
        <div className="modal-actions">
          <button className="button button-ghost" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="button button-primary" type="submit">
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
