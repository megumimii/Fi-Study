import { db, storage } from "../firebase-config";
import { ref, uploadBytes, getDownloadURL, deleteObject, list } from "firebase/storage";
import { ref as dbRef, set, get, update } from "firebase/database";

export async function uploadAndGetDownloadURLFromFirebase(file, path) {
    try {
        const storageRef = ref(storage, path);//Set the reference for Uploading and getting download URL
        const snapshot = await uploadBytes(storageRef, file);
        const URL = await getDownloadURL(storageRef);
        return { snapshot, URL };
    } catch (e) {
        console.error('Firebase Storage upload error:', e);
        throw e;
    }
}

export async function uploadAndSetMetaData(file, storagePath, dbPath, urlFieldName, extraData = {}) {//Where extra data is a JSON to be set on the object field. (EG. When uploading a photo, upload photo to a specied storagePath, and set The Metadata of the photo on the chosen path/obj)
    try {
        const { snapshot, URL } = await uploadAndGetDownloadURLFromFirebase(file, storagePath);
        const metaData = { ...extraData, [urlFieldName]: URL, createdAt: new Date().toISOString() };
        await setToDatabase(dbPath, metaData);
    }
    catch (e) {
        console.log(e)
    }
}

export async function uploadAndSetDownloadURL(file, path, dbPath, fieldName) {
    try {
        const { snapshot, URL } = await uploadAndGetDownloadURLFromFirebase(file, path);
        setToDatabase(dbPath, { [fieldName]: URL });
    } catch (e) {
        console.log(e)
    }
}

export async function uploadAndUpdateDownloadURL(file, path, dbPath, fieldName) {
    try {
        const { snapshot, URL } = await uploadAndGetDownloadURLFromFirebase(file, path);
        updateToDatabase(dbPath, { [fieldName]: URL });
    } catch (e) {
        console.log(e)
    }
}

export async function deleteFromFirebase(filePathOrURL) {
    try {
        let storagePath = filePathOrURL;

        // If input is a full URL, convert it to a Storage path
        if (filePathOrURL.startsWith("https://")) {
            const pathEncoded = filePathOrURL.split("/o/")[1]?.split("?")[0];
            if (!pathEncoded) throw new Error("Invalid storage URL");
            storagePath = decodeURIComponent(pathEncoded);
        }

        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);

    } catch (e) {
        console.error("Failed to delete file from storage:", e);
    }
}

export async function deleteFolderFromFirebase(folderPath) {
    const folderRef = ref(storage, folderPath);

    try {
        // Helper function to handle paginated listing
        async function deletePaginated(ref) {
            let pageToken = undefined;

            do {
                const listResult = await list(ref, { maxResults: 1000, pageToken });

                // Delete all files in this batch
                const deleteFiles = listResult.items.map((itemRef) => deleteObject(itemRef));
                await Promise.all(deleteFiles);

                // Recursively delete all subfolders
                const deleteSubfolders = listResult.prefixes.map((subfolderRef) =>
                    deletePaginated(subfolderRef)
                );
                await Promise.all(deleteSubfolders);

                pageToken = listResult.nextPageToken;
            } while (pageToken);
        }

        await deletePaginated(folderRef);
        console.log(`Deleted folder and all contents: ${folderPath}`);
    } catch (e) {
        console.error(`Error deleting folder ${folderPath}:`, e);
    }
}

export async function setToDatabase(path, data) {
    try {
        const Ref = dbRef(db, path);//Set the reference for SET
        await set(Ref, data);
    } catch (e) {
        console.log(e)
    }
}

export async function updateToDatabase(path, data) {
    try {
        const Ref = dbRef(db, path);//Set the reference for UPDATE
        await update(Ref, data);
    } catch (e) {
        console.log(e)
    }
}

export async function getFromDatabaseToJson(path) {
    try {
        const Ref = dbRef(db, path);//Set the reference for GET
        const snapshot = await get(Ref);
        return Object.values(snapshot.val());
    } catch (e) {
        console.log(e)
    }
}

export async function getFromDatabase(path) {
    try {
        const Ref = dbRef(db, path);//Set the reference for GET
        const snapshot = await get(Ref);
        return snapshot.val();
    } catch (e) {
        console.log(e)
    }
}

export async function deleteFromDatabase(path) {
    try {
        const Ref = dbRef(db, path);//Set the reference for DELETE
        await set(Ref, null);
    } catch (e) {
        console.log(e)
    }
}

