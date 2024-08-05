import React, {useState, useEffect, useRef} from 'react';
import {
    SafeAreaView, ScrollView, StatusBar,
    StyleSheet, Text, useColorScheme,
    View, BackHandler, Alert,
    ActivityIndicator, TextInput, Linking,
    ToastAndroid, Dimensions, Button,
    useWindowDimensions, Platform, LogBox,
    TouchableOpacity, LinearGradient
} from 'react-native';
import { WebView } from 'react-native-webview';
import firebase from '@react-native-firebase/app';
import iid from '@react-native-firebase/iid';
import messaging from '@react-native-firebase/messaging';
import analytics from '@react-native-firebase/analytics';
import SplashScreen from 'react-native-splash-screen';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-simple-toast';
import PushNotification from 'react-native-push-notification';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { NaverLogin, getProfile } from "@react-native-seoul/naver-login";
import { LoginButton, AccessToken, Profile, LoginManager, GraphRequestManager, GraphRequest } from 'react-native-fbsdk-next';
import VersionCheck from 'react-native-version-check';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNIap, { InAppPurchase, SubscriptionPurchase, finishTransaction, purchaseErrorListener, purchaseUpdatedListener, Subscription, PurchaseError } from 'react-native-iap';
import axios from 'axios';
import {check, checkMultiple, PERMISSIONS, RESULTS, request, requestMultiple} from 'react-native-permissions';
import dynamicLinks from '@react-native-firebase/dynamic-links';
import useInstallReferrer from 'react-native-google-play-install-referrer';

LogBox.ignoreLogs(['new NativeEventEmitter']); // Ignore log notification by message
LogBox.ignoreAllLogs(); //Ignore all log notifications

const androidKeys = {
  kConsumerKey: "LW0fXkSiF20Ry2Iwbp0Z",
  kConsumerSecret: "DqGikgqcRk",
  kServiceAppName: "열두간지"
};
const initials = Platform.OS === "ios" ? iosKeys : androidKeys;

const App = () => {
     const app_domain = "https://12jiji.com";
     const { isSuccess, isError, data, error } = useInstallReferrer();

    //구글로그인 파이어베이스
    useEffect(() => {
       GoogleSignin.configure({
         webClientId:
           '1018171310670-d1t1g5qu5rb3g83v832jiq5bmkau2ap2.apps.googleusercontent.com'
       });
    }, []);

    //토큰값 구하기
    useEffect(() => {
        PushNotification.setApplicationIconBadgeNumber(0);

        async function requestUserPermission() {
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

                //console.log('Authorization status:', authStatus);

            if (enabled) {
                //console.log('Authorization status:', authStatus);
                await get_token();
            }
        }

        //기기토큰 가져오기
        async function get_token() {
            await messaging()
                .getToken()
                .then(token => {
                    console.log("token", token);
                    if(token) {
                        set_tt(token);
                        return true;
                    } else {
                        return false;
                    }
                });
        }

        requestUserPermission();

        set_is_loading(true);

        return messaging().onTokenRefresh(token => {
            set_tt(token);
        });
    } ,[tt]);

    let { height, width } = Dimensions.get('window');
    //웹작업 토큰이 회원테이블에 있으면 자동로그인 없으면 로그인 페이지로 작업
    //const app_domain = "https://cnj2019.cafe24.com";
    //const url = app_domain+"/auth.php?chk_app=Y&app_token=";
    const url = app_domain+"?app_token=";
    const [refPara, setRefPara] = useState();
    const [urls, set_urls] = useState("ss");
    const [tt, set_tt] = useState();
    const webViews = useRef();
    const toast_msg = useRef();
    const [is_loading, set_is_loading] = useState(false);
    const [isLoadingEnd, setIsLoadingEnd] = useState(false);

    const [naverToken, setNaverToken] = useState();
    const [facebookToken, setFacebookToken] = useState();
    const [appVersion, setAppVersion] = useState();
    const [recentAppVersion, setRecentAppVersion] = useState();

    const [fontSize, setFontSize] = useState();
    const fontScale = useWindowDimensions().fontScale;
    const fontScaleSize = (String(fontScale).substr(0, 4))*100;

    const [productList, setProductList] = useState();
    const [buyIsLoading, setBuyIsLoading] = useState();

    const [currUrl, setCurrUrl] = useState();
    const [beforeRef, setBeforeRef] = useState();

    let canGoBack = false;
    let timeOut;

    /*레퍼러*/
    useEffect(() => {
        if (isSuccess){
            //console.log('Install Referrer Success', JSON.stringify(data));
            const refData = (JSON.stringify(data.url)).replace('"', '').replace('"', '');
            const referrerData =JSON.stringify({
                type: "checkReferrer",
                utmUrl: data.url,
                utmToken: tt,
            });
            //console.log("============= ", refData);
            setRefPara(refData);
        }else if(isError){
            //console.log('Install Referrer Error', error);
        }
    }, [isSuccess, isError]);


    /*권한 시작*/
    const [camera, setCamera] = useState(false);
    const [readStorage, setReadStorage] = useState(false);

    function setPermission(){
        requestMultiple([
            PERMISSIONS.ANDROID.CAMERA,
            PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
        ]).then(response => {
            //console.log('MULTIPLE REQUEST RESPONSE : ', response);
            const permissionData =JSON.stringify({
                type: "permissionOk",
            });
            webViews.current.postMessage(permissionData);
        });
    }

    function setPermission2(){
        check(PERMISSIONS.ANDROID.CAMERA).then((result) => {
            console.log(result);
            if(result == "granted"){ setCamera(true); }else{ setCamera(false); }
        });
        check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE).then((result) => {
            console.log(result);
            if(result == "granted"){ setReadStorage(true); }else{ setReadStorage(false); }
        });

        const permissionData =JSON.stringify({
            type: "permissionOk2",
            data1: camera,
            data2: readStorage,
        });
        webViews.current.postMessage(permissionData);
    }

    function setPermission3(){
        const permissionData =JSON.stringify({
            type: "permissionOk3",
            data1: camera,
            data2: readStorage
        });
        webViews.current.postMessage(permissionData);
    }
    /*권한 끝*/

    /*구글*/
    const onGoogleButtonPress = async () => {
        const { idToken } = await GoogleSignin.signIn();
        const googleCredential = auth.GoogleAuthProvider.credential(idToken);
        auth().signInWithCredential(googleCredential).then(function(){
            getGoogleInfo();
        });
    }

    const getGoogleInfo = async () => {
        const user = await auth().currentUser;
        console.log("구글 정보 : ", user);

        auth().onAuthStateChanged((user) => {
            if (user) {
                //setLoggedIn(true)
                //Alert.alert("loggedIn");
                const googleData =JSON.stringify({
                    type: "sns_login",
                    name: user.displayName,
                    email: user.email,
                    provider: "google",
                    photourl: user.photoURL,
                    uid: user.uid,
                    token: tt
                });
                webViews.current.postMessage(googleData);
            } else {
                //setLoggedIn(false)
                //console.log("loggedOut")
            }
        });
    }
    /*구글 끝*/

    /*네이버*/
    function naverLogin(props){
    //console.log("네이버")
        return new Promise((resolve, reject) => {
            NaverLogin.login(props, (err, token) => {
                //console.log(`\n\n 네이버  Token is fetched  :: ${token} \n\n`);
                setNaverToken(token);
                if (err) {
                  reject(err);
                  return;
                }
                resolve(token);
            })
        })
    };

    function naverLogout() {
        NaverLogin.logout();
        setNaverToken("");
    };

    async function getUserProfile() {
        const profileResult = await getProfile(naverToken.accessToken);
        if (profileResult.resultcode === "024") {
          Alert.alert("로그인 실패", profileResult.message);
          return;
        }
        console.log("naver Result", profileResult);
        const naverData =JSON.stringify({
            type: "sns_login",
            name: "",
            email: profileResult.response.email,
            provider: "naver",
            photourl: "",
            uid: profileResult.response.id,
            token: tt
        });
        webViews.current.postMessage(naverData);
    };

    if(naverToken){
        getUserProfile();
        naverLogout();
    }
    /*네이버 끝*/

    /*페이스북*/
    async function facebookLogin() {
        const result:any = await LoginManager.logInWithPermissions(["public_profile", "email"]);
        if (result.isCancelled) {
            console.log("Login cancelled");
        } else {
            const data = await AccessToken.getCurrentAccessToken()
            if (data) {
                new GraphRequestManager().addRequest(new GraphRequest(
                    '/me',{
                        parameters: {
                        'fields': {
                            'string' : 'email, name'
                        }
                    }
                }, (err, obj:any)=> {
                    if (obj) {
                        console.log("페이스북 result : ", obj);
                        const facebookData =JSON.stringify({
                              type: "sns_login",
                              name: obj.name,
                              email: obj.email,
                              provider: "facebook",
                              photourl: "",
                              uid: obj.id,
                              token: tt
                          });
                          webViews.current.postMessage(facebookData);
                        }
                    }
                )).start()
            }
        }
    }
    /*페이스북 끝*/

    useEffect(() => {
       setAppVersion(VersionCheck.getCurrentVersion()); //현재버전
    }, []);

    //console.log(VersionCheck.getLatestVersion());
    //console.log("appVersion : ", appVersion);

    //앱버전 체크
    function fnAppVersionCheck(ver){
        console.log(ver);
        let chkVal = "1111";
        if(ver == appVersion){
            chkVal = "1111";
        }else{
            chkVal = "0000";
        }
        const versionData =JSON.stringify({
          type: "appVersionChk",
          val: chkVal
        });
        webViews.current.postMessage(versionData);
    }

    const onWebViewMessage = (webViews) => {
        let jsonData = JSON.parse(webViews.nativeEvent.data);
        //console.log("jsonData.data : ", jsonData.data);
        if(jsonData.data == "naver"){
            naverLogin(initials);
        }else if(jsonData.data == "naverLogout"){
            naverLogout();
        }else if(jsonData.data == "google"){
            onGoogleButtonPress();
        }else if(jsonData.data == "facebook"){
            facebookLogin();
        }else if(jsonData.data == "textSize"){
            if(jsonData.status == "1"){
                setFontSize(fontScaleSize);
            }else{
                setFontSize(100);
            }
        }else if(jsonData.data == "fontScale" || jsonData.data == "fontRenew"){
            if(jsonData.status == "1"){
                setFontSize(fontScaleSize);
            }else{
                setFontSize(100);
            }
        }else if(jsonData.data == "inapUse"){
            requestSubscription(jsonData.code);
        }else if(jsonData.data == "appVersionCheck"){
            fnAppVersionCheck(jsonData.ver);
        }else if(jsonData.data == "beforeRef"){
            //console.log("@@@@@jsonData.cur : ", jsonData.cur);
            //console.log("@@@@@beforeRef : ", beforeRef);
            setBeforeRef(jsonData.cur);
        }else if(jsonData.data == "filePermission"){
            setPermission();
        }else if(jsonData.data == "filePermission2"){
            setPermission2();
        }else if(jsonData.data == "filePermission3"){
            setPermission3();
        }else if(jsonData.data == "popupCookie"){
            AsyncStorage.setItem("popCookie", jsonData.date, () => {
                //console.log("팝업 24시간 안보기");
            });
        }
    }

    const onNavigationStateChange = (webViewState)=>{
        set_urls(webViewState.url);

        //console.log("webViewState.url : ", webViewState.url);

        /*쿠키 체크*/
        AsyncStorage.getItem("popCookie", (err, result) => {
            const app_split = webViewState.url.split('?app_token=')[0];
            if(
                urls == app_domain
                || urls == app_domain + '/'
                || app_split == app_domain
                || app_split == app_domain + '/'
            ){
                const popDateData =JSON.stringify({
                    type: "getMainPopCookie",
                    endDate: result
                });
                webViews.current.postMessage(popDateData);
            }
        });

        //안드로이드 뒤로가기 버튼 처리
        //BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    }

    const onLoadStart = (webViewState) => {
    }
    const onLoadEnd = (webViewState) => {
        //console.log(webViewState.nativeEvent.url);
    }

//    const handleBackButton = () => {
//        const app_split = urls.split('?app_token=')[0];
//        const app_split2 = urls.split('#slide')[0];
//        const app_split3 = urls.split('?hashNavi=')[0];
//        //console.log('app_domain ' + app_domain);
//        console.log('urls ' + urls);
//        //console.log('app_split ' + app_split);
//
//        //제일 첫페이지에서 뒤로가기시 어플 종료
//        if (
//            app_split == app_domain + '/' ||
//            urls == app_domain ||
//            urls == app_domain + '/' ||
//            app_split == app_domain ||
//            app_split == app_domain + '/' ||
//            app_split2 == app_domain ||
//            app_split2 == app_domain + '/' ||
//            app_split3 == app_domain ||
//            app_split3 == app_domain + '/'
//        ) {
//            if(!canGoBack){
//                ToastAndroid.show('한번 더 누르면 종료합니다.', ToastAndroid.SHORT);
//                canGoBack = true;
//
//                timeOut = setTimeout(function(){
//                    canGoBack = false;
//                }, 2000);
//            }else{
//                clearTimeout(timeOut);
//                BackHandler.exitApp();
//                canGoBack = false;
//                //const sendData =JSON.stringify({ type:"종료" });
//            }
//        } else {
//            if(currUrl == "pushUrlCheck"){
//                moveToUrl("historyBack");
//                setCurrUrl();
//            }else{
//                webViews.current.goBack();
//            }
//        }
//        return true;
//    }

    useEffect(() => {
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, [urls]);

    const backAction = () => {
        const app_split = urls.split('?app_token=')[0];
        const app_split2 = urls.split('#slide')[0];
        const app_split3 = urls.split('?hashNavi=')[0];
        //console.log("@@@@back urls : ", app_split);
        if (
            app_split == app_domain + '/' ||
            urls == app_domain ||
            urls == app_domain + '/' ||
            app_split == app_domain ||
            app_split == app_domain + '/' ||
            app_split2 == app_domain ||
            app_split2 == app_domain + '/' ||
            app_split3 == app_domain ||
            app_split3 == app_domain + '/' ||
            urls == app_domain + '/sub/more.php' ||
            urls == app_domain + '/sub/my_storage_buy.php' ||
            urls == app_domain + '/sub/my_storage_like.php' ||
            urls == app_domain + '/sub/search_before.php'
        ){
            //console.log("메인");
            if(!canGoBack){
                ToastAndroid.show('한번 더 누르면 종료합니다.', ToastAndroid.SHORT);
                canGoBack = true;

                timeOut = setTimeout(function(){
                canGoBack = false;
                }, 2000);
            }else{
                clearTimeout(timeOut);
                BackHandler.exitApp();
                canGoBack = false;
                //const sendData =JSON.stringify({ type:"종료" });
            }
        }else{
            //console.log("서브", beforeRef);
            //console.log("서브2", urls);
            if(
                beforeRef == "u_premium.php" ||
                beforeRef == "u_theme.php" ||
                beforeRef == "u_jum.php" ||
                beforeRef == "u_gunghap.php" ||
                beforeRef == "u_saju.php"
            ){
               const typingLogChkData =JSON.stringify({
                 type: "typingLogChk"
               });
               webViews.current.postMessage(typingLogChkData);
            }else{
                if(currUrl == "pushUrlCheck"){
                    moveToUrl("historyBack");
                    setCurrUrl();
                }else{
                    webViews.current.goBack();
                }
            }
        }

        return true;
    };


    useEffect(() => {
        setTimeout(() => {
            SplashScreen.hide();
        }, 1500);
    }, []);

    function moveToUrl(url){
      setCurrUrl("pushUrlCheck");
      const pushUrlData =JSON.stringify({
          type: "appPush",
          url: url
      });
      webViews.current.postMessage(pushUrlData);
    }

    useEffect(() => {
        //푸시메세지 처리

        //포그라운드 상태
        messaging().onMessage(remoteMessage => {
            if (remoteMessage) {
                console.log('메세지 onMessage : ', remoteMessage);

                //푸시 data 에 intent값 으로 웹뷰에 스크립트 처리
                let newURL = '';
                if(remoteMessage.data.link) {
                    newURL = remoteMessage.data.link;
                }

                Alert.alert(
                    remoteMessage.notification.title, '내용을 확인하시겠습니까?',
                    [
                        { text: '네', onPress: () =>  moveToUrl(newURL) },
                        { text: '아니요' }
                    ]
                );
            }
        });

        //백그라운드 상태
        messaging().onNotificationOpenedApp(remoteMessage => {
            PushNotification.setApplicationIconBadgeNumber(0);

            if (remoteMessage) {
                console.log('메세지 onNotificationOpenedApp : ', remoteMessage);

                //푸시 data 에 intent값 으로 웹뷰에 스크립트 처리
                let newURL = '';
                if(remoteMessage.data.link) {
                    newURL = remoteMessage.data.link;
                }

                Alert.alert(
                    remoteMessage.notification.title, '내용을 확인하시겠습니까?',
                    [
                        { text: '네', onPress: () =>  moveToUrl(newURL) },
                        { text: '아니요' }
                    ]
                );
            }
        });

        //종료상태
        messaging().getInitialNotification().then(remoteMessage => {
            if (remoteMessage) {
                console.log('메세지 getInitialNotification : ', remoteMessage);

                //푸시 data 에 intent값 으로 웹뷰에 스크립트 처리
                let newURL = '';

                if(remoteMessage.data.link) {
                    newURL = remoteMessage.data.link;
                }

                setTimeout(function(){
                    Alert.alert(
                        remoteMessage.notification.title, '내용을 확인하시겠습니까?',
                        [
                            { text: '네', onPress: () =>  moveToUrl(newURL) },
                            { text: '아니요' }
                        ]
                    );
                },1500);
            }
        });
    }, []);

    //상품 결제 시작 - 작업 중
    const itemSkus = Platform.select({
        //ios: ['luck_200', 'luck_300', 'luck_500', 'luck_900', 'luck_1500', 'luck_2000'],
        android: ['luck_200', 'luck_300', 'luck_500', 'luck_900', 'luck_1500', 'luck_2000'],
    });

    useEffect(() => {
        initilizeIAPConnection();
    }, []);

    const initilizeIAPConnection = async () => {
        try {
            const result = await RNIap.initConnection();
            console.log('connection is => ', result);

            if (result) {
                await getProducts()
            }
        } catch (err) {
            console.log('error in cdm => ', err);
        }
    };
    const getProducts = async () => {
        try {
            const products = await RNIap.getProducts(itemSkus);
            //console.log('Products', products);

            if (products.length !== 0){
                if (Platform.OS === 'android'){
                    //Your logic here to save the products in states etc
                    setProductList(products);
                    //console.log('products : ', products);
                } else if (Platform.OS === 'ios'){
                    // your logic here to save the products in states etc
                    // Make sure to check the response differently for android and ios as it is different for both
                }
            }
        } catch (err){
            console.warn("IAP error",err.code, err.message, err);
        }
    }

    let purchaseUpdateSubscription = null;
    let purchaseErrorSubscription = null;
    useEffect(() => {
       purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
         async (purchase) => {
           //console.log("purchase", purchase);
           const receipt = purchase.transactionReceipt;
           //console.log("receipt", receipt);
           if (receipt) {
             try {
               if (Platform.OS === 'ios') {
                 RNIap.finishTransactionIOS(purchase.transactionId);
               } else if (Platform.OS === 'android'){
//                 await RNIap.consumeAllItemsAndroid(purchase.purchaseToken);
                 await RNIap.acknowledgePurchaseAndroid(purchase.purchaseToken);
               }
               await RNIap.finishTransaction(purchase, true);
             } catch (ackErr) {
               //console.log('ackErr INAPP>>>>', ackErr);
             }
           }
         },
       );
       purchaseErrorSubscription = RNIap.purchaseErrorListener(
         (error) => {
           //console.log('purchaseErrorListener INAPP>>>>', error);
         },
       );

       return (() => {
         if (purchaseUpdateSubscription) {
           purchaseUpdateSubscription.remove();
           purchaseUpdateSubscription = null;
         }
         if (purchaseErrorSubscription) {
           purchaseErrorSubscription.remove();
           purchaseErrorSubscription = null;
         }
       });
     }, []);

    const requestSubscription = async (sku) => {
            setBuyIsLoading(true);
            //console.log("IAP req", sku);

            try {
                await RNIap.requestSubscription(sku)
                .then(async (result) => {
                    //console.log('IAP req sub', result);
                    if (Platform.OS === 'android'){
                        //console.log("purchaseToken : ", result.purchaseToken);
                        //console.log("packageNameAndroid : ", result.packageNameAndroid);
                        //console.log("productId : ", result.productId);
                        //console.log("성공?");
                        let inappPayResult =JSON.stringify({
                            type: "inappResult",
                            code: result.productId,
                            tno: result.transactionId,
                            token: result.purchaseToken,
                        });
                        console.log("inappPayResult : ", inappPayResult);
                        webViews.current.postMessage(inappPayResult);
                        // can do your API call here to save the purchase details of particular user
                    } else if (Platform.OS === 'ios'){
                        //console.log(result.transactionReceipt);
                        // can do your API call here to save the purchase details of particular user
                    }

                    setBuyIsLoading(false);
                })
                .catch((err) => {
                    setBuyIsLoading(false);
                    //console.log('err1', err.message);
                    //setError(err.message);
                });
            } catch (err) {
                setBuyIsLoading(false);
                //console.log('err2', err.message);
                //setError(err.message);
            }

        };
    //상품 결제 끝
/*
if(setCamera && setWriteStorage && setReadStorage){
        console.log("a");
    }else{
        console.log("b");
    }
*/
  return (
    <SafeAreaView style={{flex:1}}>

            {is_loading ? (
             <View style={{flex:1, height: height}}>
                 <WebView
                     ref={webViews}
                     source={{
                         uri: url+tt+"&"+refPara,
                     }}
                     useWebKit={false}
                     onMessage={webViews => onWebViewMessage(webViews)}
                     onNavigationStateChange={(webViews) => onNavigationStateChange(webViews)}
     //                onLoadStart = {onLoadStart()}
     //                onLoadEnd={(webViews) => onLoadEnd(webViews)}
                     javaScriptEnabledAndroid={true}
                     allowFileAccess={true}
                     renderLoading={true}
                     mediaPlaybackRequiresUserAction={false}
                     setJavaScriptEnabled = {false}
                     scalesPageToFit={true}
                     allowsFullscreenVideo={true}
                     allowsInlineMediaPlayback={true}
                     originWhitelist={['*']}
                     javaScriptEnabled={true}
                     textZoom = {fontSize}
                 />
             </View>
                 ) : (
             <View style={{ marginTop: "49%" }}>
                 <ActivityIndicator size="large" />
             </View>
            )}


    </SafeAreaView>
  );
};


export default App;
