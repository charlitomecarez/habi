import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { useAddLocation, type LocationWithPath } from "@/lib/inventory";

const TOP_LEVEL = "top";

type AddLocationSheetProps = {
  visible: boolean;
  onClose: () => void;
  locations: LocationWithPath[];
  /** Pre-selects the parent, e.g. when adding a shelf from inside a room. */
  defaultParentId?: string | null;
};

type FieldsProps = Omit<AddLocationSheetProps, "visible">;

/** Mounted each time the sheet opens, so its fields always start empty. */
function AddLocationFields({ onClose, locations, defaultParentId }: FieldsProps) {
  const add = useAddLocation();
  const [name, setName] = useState("");
  const [parent, setParent] = useState<string>(defaultParentId ?? TOP_LEVEL);
  const [nameError, setNameError] = useState<string | undefined>();

  const options = [
    { value: TOP_LEVEL, label: "Nothing (a room)" },
    ...locations.map((l) => ({ value: l.id, label: l.path })),
  ];

  async function onSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Enter a name.");
      return;
    }
    await add.mutateAsync({ name: trimmed, parentId: parent === TOP_LEVEL ? null : parent });
    onClose();
  }

  return (
    <>
      <Input
        label="Name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setNameError(undefined);
        }}
        placeholder="Blue box"
        maxLength={120}
        autoFocus
        error={nameError}
      />
      <Select label="Inside" options={options} value={parent} onChange={setParent} />
      {add.error ? <Notice tone="danger">{add.error.message}</Notice> : null}
      <Button label="Save location" loading={add.isPending} onPress={onSave} />
    </>
  );
}

/** Two fields, so a sheet: the place's name and what it sits inside. */
export function AddLocationSheet({ visible, ...props }: AddLocationSheetProps) {
  return (
    <Sheet visible={visible} onClose={props.onClose} title="Add location" subtitle="A room, shelf, drawer or box.">
      {visible ? <AddLocationFields {...props} /> : null}
    </Sheet>
  );
}
