mudar nos arquivos build.gradle

compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
mudar tambem em 
/home/rodrigo/code/financeiro/node_modules/@capacitor/android/capacitor/build.gradle
e 
/home/rodrigo/code/financeiro/node_modules/@capacitor/local-notifications/android/build.gradle

comando:

npm run build
npx cap sync android
cd android
./gradlew clean                              40s 22:25:50
./gradlew assembleDebug

ou 

./gradlew clean
./gradlew assembleRelease